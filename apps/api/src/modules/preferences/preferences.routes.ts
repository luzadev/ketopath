// PRD §5.1 — preferences utente: esclusioni, cucine, tempo di cottura,
// protocollo digiuno, schedule allenamento, frequenza pasti.

import { preferencesPatchSchema } from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

function serialize(prefs: {
  exclusions: string[];
  cuisinePreferences: string[];
  cookingTime: string;
  fastingProtocol: string | null;
  trainingDays: number[];
  trainingType: string | null;
  sessionMinutes: number | null;
  mealsPerDay: number | null;
  bannedIngredientIds: string[];
}) {
  return {
    exclusions: prefs.exclusions,
    cuisinePreferences: prefs.cuisinePreferences,
    cookingTime: prefs.cookingTime,
    fastingProtocol: prefs.fastingProtocol,
    trainingDays: prefs.trainingDays,
    trainingType: prefs.trainingType,
    sessionMinutes: prefs.sessionMinutes,
    mealsPerDay: prefs.mealsPerDay,
    bannedIngredientIds: prefs.bannedIngredientIds,
  };
}

const EMPTY_PREFS = {
  exclusions: [],
  cuisinePreferences: [],
  cookingTime: 'MEDIUM' as const,
  fastingProtocol: null,
  trainingDays: [],
  trainingType: null,
  sessionMinutes: null,
  mealsPerDay: null,
  bannedIngredientIds: [],
};

export const preferencesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/preferences', { preHandler: requireAuth() }, async (request) => {
    const userId = request.user!.id;
    const prefs = await fastify.prisma.preferences.findUnique({ where: { userId } });
    return { preferences: prefs ? serialize(prefs) : EMPTY_PREFS };
  });

  fastify.patch('/me/preferences', { preHandler: requireAuth() }, async (request, reply) => {
    const parsed = preferencesPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const userId = request.user!.id;
    const data = parsed.data;

    const create: Record<string, unknown> = {
      userId,
      exclusions: data.exclusions ?? [],
      cuisinePreferences: data.cuisinePreferences ?? [],
      cookingTime: data.cookingTime ?? 'MEDIUM',
      fastingProtocol: data.fastingProtocol ?? null,
      trainingDays: data.trainingDays ?? [],
      trainingType: data.trainingType ?? null,
      sessionMinutes: data.sessionMinutes ?? null,
      mealsPerDay: data.mealsPerDay ?? null,
      bannedIngredientIds: data.bannedIngredientIds ?? [],
    };
    const update: Record<string, unknown> = {};
    if (data.exclusions !== undefined) update.exclusions = data.exclusions;
    if (data.cuisinePreferences !== undefined) update.cuisinePreferences = data.cuisinePreferences;
    if (data.cookingTime !== undefined) update.cookingTime = data.cookingTime;
    if (data.fastingProtocol !== undefined) update.fastingProtocol = data.fastingProtocol;
    if (data.trainingDays !== undefined) update.trainingDays = data.trainingDays;
    if (data.trainingType !== undefined) update.trainingType = data.trainingType;
    if (data.sessionMinutes !== undefined) update.sessionMinutes = data.sessionMinutes;
    if (data.mealsPerDay !== undefined) update.mealsPerDay = data.mealsPerDay;
    if (data.bannedIngredientIds !== undefined)
      update.bannedIngredientIds = data.bannedIngredientIds;

    const prefs = await fastify.prisma.preferences.upsert({
      where: { userId },
      create: create as never,
      update,
    });

    return { preferences: serialize(prefs) };
  });

  // PRD §6 — catalogo ingredienti per la UI di esclusioni granulari.
  // Ricerca case-insensitive per nome, oppure filtro per ids (per resolvere
  // i bannati attualmente salvati). Max 50 risultati.
  fastify.get('/me/ingredients', { preHandler: requireAuth() }, async (request) => {
    const query = request.query as { q?: string; ids?: string };
    const q = query.q?.trim() ?? '';
    const idsRaw = query.ids?.trim() ?? '';
    const where =
      idsRaw.length > 0
        ? {
            id: {
              in: idsRaw
                .split(',')
                .filter((s) => s.length > 0)
                .slice(0, 50),
            },
          }
        : q.length > 0
          ? { name: { contains: q, mode: 'insensitive' as const } }
          : {};
    const ingredients = await fastify.prisma.ingredient.findMany({
      where,
      select: { id: true, name: true, category: true, exclusionGroups: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return { ingredients };
  });
};
