import fp from 'fastify-plugin';
import { createAdsbLolProvider } from './adsblol.js';
import { createPlaneCache, type PlaneCache } from './cache.js';

declare module 'fastify' {
  interface FastifyInstance {
    planeCache: PlaneCache;
  }
}

export default fp(async (app) => {
  const provider = createAdsbLolProvider({
    baseUrl: process.env.ADSB_API_BASE ?? 'https://api.adsb.lol',
    apiKey: process.env.ADSB_API_KEY,
  });
  app.decorate('planeCache', createPlaneCache({ provider }));
  app.log.info({ provider: provider.name, apiKey: Boolean(process.env.ADSB_API_KEY) }, 'live plane provider ready');
});