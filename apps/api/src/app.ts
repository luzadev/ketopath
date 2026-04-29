import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { env } from './config/env.js';
import { Sentry } from './lib/sentry.js';
import { dbRoutes } from './modules/db/db.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { meRoutes } from './modules/me/me.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { planRoutes } from './modules/plan/plan.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { shoppingRoutes } from './modules/shopping/shopping.routes.js';
import { fastRoutes } from './modules/tracking/fast.routes.js';
import { weightRoutes } from './modules/tracking/weight.routes.js';
import { authPlugin } from './plugins/auth.js';
import { prismaPlugin } from './plugins/prisma.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : {}),
    },
    disableRequestLogging: env.NODE_ENV === 'production',
  });

  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(sensible);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(dbRoutes);
  await app.register(meRoutes);
  await app.register(profileRoutes);
  await app.register(weightRoutes);
  await app.register(fastRoutes);
  await app.register(planRoutes);
  await app.register(shoppingRoutes);
  await app.register(notificationsRoutes);

  if (env.SENTRY_DSN) {
    app.setErrorHandler((err, request, reply) => {
      if (request.user) {
        Sentry.captureException(err, {
          user: { id: request.user.id, email: request.user.email },
        });
      } else {
        Sentry.captureException(err);
      }
      app.log.error({ err }, 'unhandled error');
      reply.send(err);
    });
  }

  return app;
}
