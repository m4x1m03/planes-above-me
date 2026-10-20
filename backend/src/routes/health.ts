import type { FastifyInstance } from 'fastify';

export const healthRoute = async (app: FastifyInstance) => {
  app.get('/health', async (request, reply) => {
    let db: 'up' | 'down' = 'down';
    try {
      await app.db.query('SELECT 1');
      db = 'up';
    } catch {
      // DB unreachable: still report healthy so the ALB keeps the task in service
    }
    return reply.code(200).send({ status: 'ok', db });
  });
};