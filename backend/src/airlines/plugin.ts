// src/airlines/plugin.ts
import fp from 'fastify-plugin';
import type { Airline } from './types.js';

declare module 'fastify' {
  interface FastifyInstance {
    airlines: Map<string, Airline>;
  }
}

export default fp(async (app) => {
  app.decorate('airlines', new Map<string, Airline>());

  if (!app.dbReady) {
    app.log.warn('skipping airline load: database not ready');
    return;
  }

  try {
    const result = await app.db.query<Airline>(
      'SELECT icao, name, telephony, country FROM airlines',
    );

    for(const airline of result.rows){
      app.airlines.set(airline.icao, airline);
    }

    app.log.info({ count: app.airlines.size }, 'airlines loaded');
  } catch (err) {
    app.log.warn({ err }, 'failed to load airlines, continuing without them');
  }
}, { name: 'airlines', dependencies: ['seed'] });