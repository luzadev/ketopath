// PRD §5.1 — preferences utente: esclusioni, cucine, tempo di cottura,
// protocollo digiuno default. Le esclusioni filtrano il matchmaking ricette.

import { preferencesPatchSchema } from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

export const preferencesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/preferences', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const prefs = await fastify.prisma.preferences.findUnique({ where: { userId } });
    return {
      preferences: prefs
        ? {
            exclusions: prefs.exclusions,
            cuisinePreferences: prefs.cuisinePreferences,
            cookingTime: prefs.cookingTime,
            fastingProtocol: prefs.fastingProtocol,
          }
        : {
            exclusions: [],
            cuisinePreferences: [],
            cookingTime: 'MEDIUM',
            fastingProtocol: null,
          },
    };
  });

  fastify.patch('/me/preferences', { preHandler: requireAuth() }, async (request, reply) => {
    const parsed = preferencesPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const userId = request.user!.id;
    const data = parsed.data;

    // Costruiamo il diff: con `exactOptionalPropertyTypes` Prisma rifiuta i
    // campi `undefined` espliciti.
    const create: Record<string, unknown> = {
      userId,
      exclusions: data.exclusions ?? [],
      cuisinePreferences: data.cuisinePreferences ?? [],
      cookingTime: data.cookingTime ?? 'MEDIUM',
      fastingProtocol: data.fastingProtocol ?? null,
    };
    const update: Record<string, unknown> = {};
    if (data.exclusions !== undefined) update.exclusions = data.exclusions;
    if (data.cuisinePreferences !== undefined) update.cuisinePreferences = data.cuisinePreferences;
    if (data.cookingTime !== undefined) update.cookingTime = data.cookingTime;
    if (data.fastingProtocol !== undefined) update.fastingProtocol = data.fastingProtocol;

    const prefs = await fastify.prisma.preferences.upsert({
      where: { userId },
      create: create as never,
      update,
    });

    return {
      preferences: {
        exclusions: prefs.exclusions,
        cuisinePreferences: prefs.cuisinePreferences,
        cookingTime: prefs.cookingTime,
        fastingProtocol: prefs.fastingProtocol,
      },
    };
  });
};
