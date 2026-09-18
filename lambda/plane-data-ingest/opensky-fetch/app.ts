import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const OPENSKY_STATES_URL = 'https://opensky-network.org/api/states/all';
const OPENSKY_TOKEN_URL =
    'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

// Refresh the OpenSky access token a bit before it actually expires (tokens last ~30 minutes)
// so a request never starts with a token that's about to be rejected mid-flight.
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

// EventBridge can't schedule below 1-minute granularity, so each invocation loops internally,
// polling roughly every 10s until it's about to run out of execution time.
const POLL_INTERVAL_MS = 10_000;
const REMAINING_TIME_SAFETY_BUFFER_MS = 5_000;

const OPENSKY_SECRET_ARN = process.env.OPENSKY_SECRET_ARN;
const INGEST_SECRET_ARN = process.env.INGEST_SECRET_ARN;
const BACKEND_INGEST_URL = process.env.BACKEND_INGEST_URL;

const secretsClient = new SecretsManagerClient({});

interface OpenSkyCredentials {
    clientId: string;
    clientSecret: string;
}

interface CachedToken {
    accessToken: string;
    expiresAt: number;
}

// Cached across warm Lambda invocations to avoid re-fetching secrets/tokens on every poll.
let cachedCredentials: OpenSkyCredentials | null = null;
let cachedIngestSecret: string | null = null;
let cachedToken: CachedToken | null = null;

// Lambda's structured JSON logging serializes Error objects into its own
// {errorType, errorMessage, stackTrace} shape and drops custom properties like
// `cause` entirely, so we pull it out manually before logging.
const describeError = (err: unknown): Record<string, unknown> => {
    if (err instanceof Error) {
        const cause = err.cause;
        return {
            message: err.message,
            causeMessage: cause instanceof Error ? cause.message : cause,
            causeCode:
                cause && typeof cause === 'object' && 'code' in cause
                    ? (cause as { code: unknown }).code
                    : undefined,
        };
    }
    return { message: String(err) };
};

const getSecretString = async (secretArn: string): Promise<string> => {
    const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    if (!result.SecretString) {
        throw new Error(`Secret ${secretArn} has no SecretString`);
    }
    return result.SecretString;
};

const getOpenSkyCredentials = async (): Promise<OpenSkyCredentials> => {
    if (cachedCredentials) {
        return cachedCredentials;
    }
    if (!OPENSKY_SECRET_ARN) {
        throw new Error('OPENSKY_SECRET_ARN is not configured');
    }
    cachedCredentials = JSON.parse(await getSecretString(OPENSKY_SECRET_ARN)) as OpenSkyCredentials;
    return cachedCredentials;
};

const getIngestSecret = async (): Promise<string> => {
    if (cachedIngestSecret) {
        return cachedIngestSecret;
    }
    if (!INGEST_SECRET_ARN) {
        throw new Error('INGEST_SECRET_ARN is not configured');
    }
    cachedIngestSecret = await getSecretString(INGEST_SECRET_ARN);
    return cachedIngestSecret;
};

const getAccessToken = async (): Promise<string> => {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }

    const { clientId, clientSecret } = await getOpenSkyCredentials();

    let response: Response;
    try {
        response = await fetch(OPENSKY_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });
    } catch (err) {
        console.log(JSON.stringify({ stage: 'opensky-token-fetch', ...describeError(err) }));
        throw err;
    }

    if (!response.ok) {
        throw new Error(`OpenSky token endpoint returned ${response.status}`);
    }

    const tokenData = (await response.json()) as { access_token: string; expires_in: number };

    cachedToken = {
        accessToken: tokenData.access_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS,
    };

    return cachedToken.accessToken;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface PollResult {
    sizeBytes: number;
    recordCount: number;
}

const pollOnce = async (): Promise<PollResult> => {
    const accessToken = await getAccessToken();

    let response: Response;
    try {
        response = await fetch(OPENSKY_STATES_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    } catch (err) {
        console.log(JSON.stringify({ stage: 'opensky-states-fetch', ...describeError(err) }));
        throw err;
    }

    if (!response.ok) {
        throw new Error(`OpenSky API returned ${response.status}`);
    }

    const rawBody = await response.text();
    const sizeBytes = new TextEncoder().encode(rawBody).length;

    const data = JSON.parse(rawBody) as { time: number; states: unknown[][] };
    const recordCount = data.states?.length ?? 0;

    console.log('Response size (bytes):', sizeBytes, 'Record count:', recordCount);

    const ingestSecret = await getIngestSecret();

    let backendResponse: Response;
    try {
        backendResponse = await fetch(BACKEND_INGEST_URL as string, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Ingest-Secret': ingestSecret,
            },
            body: rawBody,
        });
    } catch (err) {
        console.log(JSON.stringify({ stage: 'backend-ingest-post', ...describeError(err) }));
        throw err;
    }

    if (!backendResponse.ok) {
        throw new Error(`Backend ingest endpoint returned ${backendResponse.status}`);
    }

    return { sizeBytes, recordCount };
};

export const lambdaHandler = async (
    _event: APIGatewayProxyEvent,
    context: Context,
): Promise<APIGatewayProxyResult> => {
    if (!BACKEND_INGEST_URL) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'BACKEND_INGEST_URL is not configured' }),
        };
    }

    const results: PollResult[] = [];
    const errors: string[] = [];

    while (true) {
        try {
            results.push(await pollOnce());
        } catch (err) {
            console.log(err);
            errors.push(err instanceof Error ? err.message : String(err));
        }

        const hasTimeForAnotherPoll =
            context.getRemainingTimeInMillis() > POLL_INTERVAL_MS + REMAINING_TIME_SAFETY_BUFFER_MS;
        if (!hasTimeForAnotherPoll) {
            break;
        }

        await sleep(POLL_INTERVAL_MS);
    }

    return {
        statusCode: results.length > 0 ? 200 : 500,
        body: JSON.stringify({ iterations: results.length, results, errors }),
    };
};