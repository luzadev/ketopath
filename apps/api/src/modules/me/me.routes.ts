import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

export const meRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', { preHandler: requireAuth() }, async (request) => ({
    user: request.user,
    session: request.session,
  }));
};
