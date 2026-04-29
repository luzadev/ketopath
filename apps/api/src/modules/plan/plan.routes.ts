import {
  DEFAULT_MEAL_SHARE,
  calculateBmr,
  calculateTdee,
  macrosForPhase,
  matchMeals,
  type RecipeCandidate,
} from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

const MEALS = ['COLAZIONE', 'PRANZO', 'SPUNTINO', 'CENA'] as const;

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-anchored week
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function phaseToInt(p: string): 1 | 2 | 3 {
  if (p === 'INTENSIVE') return 1;
  if (p === 'TRANSITION') return 2;
  return 3;
}

export const planRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/me/meal-plans', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;

    const profile = await fastify.prisma.profile.findUnique({
      where: { userId },
      include: { user: { include: { preferences: true } } },
    });
    if (!profile) return reply.code(409).send({ error: 'profile_required' });

    const recipes = await fastify.prisma.recipe.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        kcal: true,
        proteinG: true,
        fatG: true,
        netCarbG: true,
        phases: true,
      },
    });
    if (recipes.length === 0) {
      return reply.code(409).send({ error: 'recipe_catalog_empty' });
    }

    const candidates: RecipeCandidate[] = recipes.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      kcal: r.kcal,
      proteinG: r.proteinG,
      fatG: r.fatG,
      netCarbG: r.netCarbG,
      exclusionTags: [],
      phases: r.phases.filter((p): p is 1 | 2 | 3 => p === 1 || p === 2 || p === 3),
    }));

    const weightCurrentKg = Number(profile.weightCurrentKg);
    const bmr = calculateBmr({
      weightKg: weightCurrentKg,
      heightCm: profile.heightCm,
      ageYears: profile.age,
      gender: profile.gender,
    });
    const tdee = calculateTdee(bmr, profile.activityLevel);
    const phaseInt = phaseToInt(profile.currentPhase);
    // Deficit base solo in fase 1; in fase 2/3 si avvicina a TDEE.
    const kcalTarget = Math.round(phaseInt === 1 ? tdee - 500 : phaseInt === 2 ? tdee - 200 : tdee);
    const dailyTarget = macrosForPhase({ kcalTarget, weightKg: weightCurrentKg, phase: phaseInt });
    const exclusions = profile.user.preferences?.exclusions ?? [];

    const weekStart = startOfWeek(new Date());

    const plan = await fastify.prisma.mealPlan.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart },
      update: { generatedAt: new Date(), status: 'ACTIVE' },
    });

    // Wipe existing slots before regenerating, in case the plan already existed.
    await fastify.prisma.mealSlot.deleteMany({ where: { planId: plan.id } });

    const plannedSlots: Array<{ day: number; meal: string; recipeId: string | null }> = [];
    for (let day = 0; day < 7; day++) {
      // Per ogni pasto, le ricette già scelte negli ultimi 2 giorni sono "recenti".
      const recentlyConsumedIds: string[] = plannedSlots
        .filter((s) => day - s.day <= 2 && s.recipeId)
        .map((s) => s.recipeId!);

      for (const meal of MEALS) {
        const top = matchMeals({
          candidates,
          meal,
          phase: phaseInt,
          excludedTags: exclusions,
          recentlyConsumedIds,
          dailyTarget,
          mealShare: DEFAULT_MEAL_SHARE,
          topN: 5,
        });
        const selected = top[0];
        await fastify.prisma.mealSlot.create({
          data: {
            planId: plan.id,
            dayOfWeek: day,
            meal,
            recipeId: selected?.id ?? null,
            alternatives: { connect: top.slice(1).map((r) => ({ id: r.id })) },
          },
        });
        plannedSlots.push({ day, meal, recipeId: selected?.id ?? null });
      }
    }

    return reply.code(201).send({
      plan: {
        id: plan.id,
        weekStart: plan.weekStart.toISOString().slice(0, 10),
        dailyTarget,
      },
    });
  });

  fastify.get('/me/meal-plans/current', { preHandler: requireAuth() }, async (request, reply) => {
    const plan = await fastify.prisma.mealPlan.findFirst({
      where: { userId: request.user!.id, status: 'ACTIVE' },
      orderBy: { weekStart: 'desc' },
      include: {
        slots: {
          include: {
            selected: { select: { id: true, name: true, kcal: true } },
            alternatives: { select: { id: true, name: true, kcal: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { meal: 'asc' }],
        },
      },
    });
    if (!plan) return reply.code(404).send({ error: 'plan_not_found' });
    return {
      plan: {
        id: plan.id,
        weekStart: plan.weekStart.toISOString().slice(0, 10),
        slots: plan.slots,
      },
    };
  });
};
