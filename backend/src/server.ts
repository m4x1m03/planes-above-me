import Fastify from 'fastify';
import { ingestRoute } from './routes/ingest.js';

export const buildServer = () => {
    const app = Fastify({
        logger: true,
        // OpenSky's full states snapshot can be a few MB; default 1MiB bodyLimit is too small.
        bodyLimit: 10 * 1024 * 1024,
    });

    app.register(ingestRoute);

    return app;
};
