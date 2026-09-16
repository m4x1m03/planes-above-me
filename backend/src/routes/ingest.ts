import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { OpenSkySnapshotPayload } from '../cache.js';
import { setSnapshot } from '../cache.js';
import 'dotenv/config';

const INGEST_SECRET = process.env.INGEST_SECRET;

export const ingestRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
    app.post<{ Body: OpenSkySnapshotPayload }>('/ingest', async (request, reply) => {
        const providedSecret = request.headers['x-ingest-secret'];

        console.log('expected:', JSON.stringify(INGEST_SECRET));
        console.log('received:', JSON.stringify(providedSecret));

        if (!INGEST_SECRET || providedSecret !== INGEST_SECRET) {
            return reply.code(401).send({ message: 'unauthorized' });
        }

        const snapshot = setSnapshot(request.body);

        request.log.info(
            { recordCount: snapshot.recordCount, time: snapshot.time },
            'Received OpenSky snapshot',
        );

        return reply.code(200).send({ status: 'ok', recordCount: snapshot.recordCount });
    });
};
