import { prisma } from '@ketopath/db';
import fp from 'fastify-plugin';

export const prismaPlugin = fp(async (app) => {
  await prisma.$connect();
  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
