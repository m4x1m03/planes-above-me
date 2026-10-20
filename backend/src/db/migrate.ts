import fp from 'fastify-plugin';
import { runner } from 'node-pg-migrate';

export default fp(async (app) => {
  if (!app.dbReady) {
    app.log.warn('skipping migrations: database not ready');
    return;
  }

  const client = await app.db.connect();
  try {
    const applied = await runner({
      dbClient: client,
      dir: 'migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: (msg) => app.log.debug(msg),
    });
    app.log.info({ applied: applied.map((m) => m.name) }, 'migrations up to date');
  } catch (err) {
    app.dbReady = false;
    app.log.error({ err }, 'migrations failed, continuing without database');
  } finally {
    client.release();
  }
}, { name: 'migrate', dependencies: ['db'] });