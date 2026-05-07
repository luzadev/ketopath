import { isProActive } from '@ketopath/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ensureSubscription, toSnapshot } from '../modules/billing/service.js';

/**
 * ADR 0004 — middleware "paywall": le rotte/azioni Pro-only lo applicano
 * dopo `requireAuth()`. Risponde 402 (`payment_required`) se l'utente non
 * ha accesso Pro (trial scaduto, canceled, expired).
 *
 * Side effect benefico: `ensureSubscription` crea il record di trial se non
 * esiste. Significa che chiamando una rotta gated, un utente nuovo riceve
 * automaticamente il trial — non servono webhook on-signup.
 */
export function requirePro() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const sub = await ensureSubscription(
      request.server.prisma,
      request.user.id,
      request.user.createdAt,
    );
    if (!isProActive(toSnapshot(sub))) {
      return reply.code(402).send({ error: 'payment_required', kind: 'pro_required' });
    }
  };
}
