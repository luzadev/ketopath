import { auth } from '@ketopath/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

type SessionPayload = Awaited<ReturnType<typeof auth.api.getSession>>;
type User = NonNullable<SessionPayload>['user'];
type Session = NonNullable<SessionPayload>['session'];

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
    session: Session | null;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest('user', null);
  app.decorateRequest('session', null);

  app.addHook('preHandler', async (request) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }

    const result = await auth.api.getSession({ headers });
    request.user = result?.user ?? null;
    request.session = result?.session ?? null;
  });
});

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user || !request.session) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  };
}
