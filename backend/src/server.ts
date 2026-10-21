import Fastify from 'fastify';
import { planesRoute } from './routes/planes.js';
import {fastifyCors} from '@fastify/cors';
import { healthRoute } from './routes/health.js';
import dbPlugin from './db/plugin.js';
import migratePlugin from './db/migrate.js';
import seedPlugin from './db/seed/plugin.js';
import airlinesPlugin from './airlines/plugin.js'
import providerPlugin from './providers/plugin.js'

export const buildServer = () => {
    const app = Fastify({
        logger: true,
    });

    app.register(dbPlugin);
    app.register(migratePlugin);
    app.register(seedPlugin);
    app.register(airlinesPlugin);
    app.register(providerPlugin);

    // TODO: make it read a env var instead later
    app.register(fastifyCors, {
        origin: ['http://localhost:5173', 'https://planes-above.com', 'https://www.planes-above.com'],
    });

    app.register(planesRoute);
    app.register(healthRoute);

    return app;
};
