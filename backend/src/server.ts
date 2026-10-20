import Fastify from 'fastify';
import { ingestRoute } from './routes/ingest.js';
import { planesRoute } from './routes/planes.js';
import {fastifyCors} from '@fastify/cors';
import { healthRoute } from './routes/health.js';
import dbPlugin from './db/plugin.js';
import migratePlugin from './db/migrate.js';
import seedPlugin from './db/seed/plugin.js';
import airlinesPlugin from './airlines/plugin.js'

export const buildServer = () => {
    const app = Fastify({
        logger: true,
        // OpenSky's full states snapshot can be a few MB; default 1MiB bodyLimit is too small.
        bodyLimit: 10 * 1024 * 1024,
    });

    app.register(dbPlugin);
    app.register(migratePlugin);
    app.register(seedPlugin);
    app.register(airlinesPlugin);

    // TODO: make it read a env var instead later
    app.register(fastifyCors, {
        origin: ['http://localhost:5173', 'https://planes-above.com', 'https://www.planes-above.com'],
    });

    app.register(ingestRoute);
    app.register(planesRoute);
    app.register(healthRoute);

    return app;
};
