import fp from 'fastify-plugin';
import { seedAirlines } from './airlines.js';

export default fp(async (app) => {
  if (!app.dbReady) {
    app.log.warn('skipping seed: database not ready');
    return;
  }
  try {
    await seedAirlines(app);
  } catch (err) {
    app.log.error({ err }, 'airline seed failed');
  }
}, { name: 'seed', dependencies: ['migrate'] });