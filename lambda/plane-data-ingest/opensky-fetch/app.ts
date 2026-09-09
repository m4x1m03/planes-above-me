import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const OPENSKY_STATES_URL = 'https://opensky-network.org/api/states/all';

export const lambdaHandler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const response = await fetch(OPENSKY_STATES_URL);
        if (!response.ok) {
            throw new Error(`OpenSky API returned ${response.status}`);
        }

        const data = (await response.json()) as { time: number; states: unknown[][] };
        const firstRecord = data.states?.[0];

        console.log('First record:', firstRecord);

        return {
            statusCode: 200,
            body: JSON.stringify({
                firstRecord,
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
