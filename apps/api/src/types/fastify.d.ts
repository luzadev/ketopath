import type { prisma } from '@ketopath/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}
