// PRD §6 — route achievement: lista degli sbloccati per l'utente, con i
// "locked" inferiti lato client dal catalogo statico.

import { ACHIEVEMENT_KEYS, type AchievementKey } from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

export const achievementsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/achievements', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const rows = await fastify.prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
      select: { key: true, unlockedAt: true },
    });
    // Filtra eventuali key legacy non più nel catalogo: niente errori UI.
    const validKeys = new Set<string>(ACHIEVEMENT_KEYS);
    const unlocked = rows
      .filter((r) => validKeys.has(r.key))
      .map((r) => ({ key: r.key as AchievementKey, unlockedAt: r.unlockedAt.toISOString() }));
    return { unlocked };
  });
};
