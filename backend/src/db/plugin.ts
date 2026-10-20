import fp from 'fastify-plugin';
import pg from 'pg';
import { buildPoolConfig } from './config.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: pg.Pool;
    dbReady: boolean;
  }
}

export default fp(async (app) => {
  const pool = new pg.Pool(buildPoolConfig());

  pool.on('error', (err) => app.log.error({ err }, 'idle database client error'));

  app.decorate('db', pool);
  app.decorate('dbReady', false);

  try {
    await pool.query('SELECT 1');
    app.dbReady = true;
    app.log.info('database connected');
  } catch (err) {
    app.log.warn({ err }, 'database unavailable, continuing without it');
  }

  app.addHook('onClose', async () => {
    await pool.end();
  });
}, { name: 'db' });