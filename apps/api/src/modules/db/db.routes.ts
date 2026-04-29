import type { FastifyPluginAsync } from 'fastify';

export const dbRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/db/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'reachable' };
    } catch (err) {
      fastify.log.error({ err }, 'database health check failed');
      return reply.code(503).send({ status: 'error', database: 'unreachable' });
    }
  });
};
