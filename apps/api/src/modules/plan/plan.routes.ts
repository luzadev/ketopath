import {
  bmrAdjustForDietHistory,
  bmrAdjustmentForConditions,
  calculateBmr,
  calculateBmrKatchMcArdle,
  calculateTdee,
  computeDailyKcalTarget,
  extraKcalForSession,
  hasExcludingCondition,
  isTrainingDay,
  macrosForPhase,
  matchMeals,
  maxPrepMinutesFor,
  mealShareForFrequency,
  protocolPlanForDay,
  type DietHistory,
  type FastingProtocolKey,
  type RecipeCandidate,
  type TrainingType,
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

function parseConditions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
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
        prepMinutes: true,
        ingredients: {
          select: { ingredient: { select: { exclusionGroups: true } } },
        },
      },
    });
    if (recipes.length === 0) {
      return reply.code(409).send({ error: 'recipe_catalog_empty' });
    }

    const candidates: RecipeCandidate[] = recipes.map((r) => {
      const tags = new Set<string>();
      for (const ri of r.ingredients) {
        for (const g of ri.ingredient.exclusionGroups) tags.add(g);
      }
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        kcal: r.kcal,
        proteinG: r.proteinG,
        fatG: r.fatG,
        netCarbG: r.netCarbG,
        exclusionTags: Array.from(tags),
        phases: r.phases.filter((p): p is 1 | 2 | 3 => p === 1 || p === 2 || p === 3),
        prepMinutes: r.prepMinutes,
      };
    });

    // Condizioni escludenti: PRD §14.3 — blocchiamo la generazione e
    // rimandiamo l'utente al medico (lato UI mostriamo un disclaimer).
    const conditions = parseConditions(profile.medicalConditions);
    if (hasExcludingCondition(conditions)) {
      return reply.code(409).send({ error: 'medical_block', conditions });
    }

    const weightCurrentKg = Number(profile.weightCurrentKg);
    const bodyFatPct = profile.bodyFatPct ? Number(profile.bodyFatPct) : null;
    // BMR: Katch-McArdle (FFM-based) se BF% noto, altrimenti Mifflin.
    let bmr = bodyFatPct
      ? calculateBmrKatchMcArdle(weightCurrentKg, bodyFatPct)
      : calculateBmr({
          weightKg: weightCurrentKg,
          heightCm: profile.heightCm,
          ageYears: profile.age,
          gender: profile.gender,
        });
    // Aggiusto BMR per condizioni che lo influenzano (es. ipotiroidismo -10%).
    bmr *= bmrAdjustmentForConditions(conditions);
    bmr *= bmrAdjustForDietHistory(profile.dietHistory as DietHistory | null);
    const tdee = calculateTdee(bmr, profile.activityLevel);
    const phaseInt = phaseToInt(profile.currentPhase);

    // Schedule allenamento: kcal extra sui giorni di allenamento.
    const trainingDays = profile.user.preferences?.trainingDays ?? [];
    const trainingType =
      (profile.user.preferences?.trainingType as TrainingType | null | undefined) ?? null;
    const sessionMinutes = profile.user.preferences?.sessionMinutes ?? null;
    const sessionExtraKcal =
      trainingType && sessionMinutes
        ? extraKcalForSession({
            type: trainingType,
            durationMinutes: sessionMinutes,
            weightKg: weightCurrentKg,
          })
        : 0;
    const mealsPerDay = profile.user.preferences?.mealsPerDay ?? null;

    // Deficit dinamico da targetWeeklyLossKg (con caps di sicurezza).
    const { kcalTarget: baseKcal } = computeDailyKcalTarget({
      tdee,
      weightCurrentKg,
      targetWeeklyLossKg: profile.targetWeeklyLossKg,
      phase: phaseInt,
    });
    const baseDailyTarget = macrosForPhase({
      kcalTarget: baseKcal,
      weightKg: weightCurrentKg,
      phase: phaseInt,
    });
    const exclusions = profile.user.preferences?.exclusions ?? [];
    const fastingProtocol =
      (profile.user.preferences?.fastingProtocol as FastingProtocolKey | null | undefined) ?? null;
    const cookingTime =
      (profile.user.preferences?.cookingTime as 'LOW' | 'MEDIUM' | 'HIGH' | null | undefined) ??
      null;
    const maxPrepMinutes = maxPrepMinutesFor(cookingTime);

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
      const dayPlan = protocolPlanForDay(fastingProtocol, day);
      // Giorno di digiuno completo (ESE_24): salta tutto.
      if (dayPlan.kcalMultiplier === 0) continue;

      // Se non c'è un protocollo IF attivo e l'utente ha dichiarato
      // mealsPerDay, lo usiamo per ridistribuire le quote per pasto.
      const effectiveShare =
        !fastingProtocol && mealsPerDay ? mealShareForFrequency(mealsPerDay) : dayPlan.share;

      // Sui giorni di allenamento aumentiamo le kcal per coprire l'EE
      // della sessione (Ainsworth 2011 — vedi preferences/training.ts).
      const trainingExtra = isTrainingDay(day, trainingDays) ? sessionExtraKcal : 0;
      const dailyKcal = Math.round(baseKcal * dayPlan.kcalMultiplier + trainingExtra);
      const dailyTarget = macrosForPhase({
        kcalTarget: dailyKcal,
        weightKg: weightCurrentKg,
        phase: phaseInt,
      });

      // Ricette scelte negli ultimi 2 giorni sono "recenti".
      const recentlyConsumedIds: string[] = plannedSlots
        .filter((s) => day - s.day <= 2 && s.recipeId)
        .map((s) => s.recipeId!);

      for (const meal of MEALS) {
        // Pasto disabilitato dal protocollo o dalla frequenza: salta lo slot.
        if (effectiveShare[meal] === 0) continue;

        const top = matchMeals({
          candidates,
          meal,
          phase: phaseInt,
          excludedTags: exclusions,
          recentlyConsumedIds,
          dailyTarget,
          mealShare: effectiveShare,
          maxPrepMinutes,
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
        dailyTarget: baseDailyTarget,
        fastingProtocol,
      },
    });
  });

  fastify.patch(
    '/me/meal-plans/slots/:slotId',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const slotId = (request.params as { slotId: string }).slotId;
      const body = request.body as { recipeId?: unknown };
      if (typeof body.recipeId !== 'string') {
        return reply.code(400).send({ error: 'invalid_body' });
      }
      const userId = request.user!.id;

      const slot = await fastify.prisma.mealSlot.findFirst({
        where: { id: slotId, plan: { userId } },
        include: { alternatives: { select: { id: true } } },
      });
      if (!slot) return reply.code(404).send({ error: 'slot_not_found' });

      const allowedIds = new Set([slot.recipeId, ...slot.alternatives.map((a) => a.id)]);
      if (!allowedIds.has(body.recipeId)) {
        return reply.code(400).send({ error: 'recipe_not_in_alternatives' });
      }

      const updated = await fastify.prisma.mealSlot.update({
        where: { id: slotId },
        data: { recipeId: body.recipeId },
        include: {
          selected: { select: { id: true, name: true, kcal: true } },
        },
      });
      return { slot: updated };
    },
  );

  // PRD §5.1 — rigenera UN solo slot: ricalcola le top5 ricette tenendo
  // conto dei pasti del giorno già scelti (coerenza dei macros).
  fastify.post(
    '/me/meal-plans/slots/:slotId/regenerate',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const slotId = (request.params as { slotId: string }).slotId;
      const userId = request.user!.id;

      const slot = await fastify.prisma.mealSlot.findFirst({
        where: { id: slotId, plan: { userId } },
        include: {
          plan: {
            include: {
              slots: {
                include: {
                  selected: {
                    select: {
                      id: true,
                      kcal: true,
                      proteinG: true,
                      fatG: true,
                      netCarbG: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!slot) return reply.code(404).send({ error: 'slot_not_found' });

      const profile = await fastify.prisma.profile.findUnique({
        where: { userId },
        include: { user: { include: { preferences: true } } },
      });
      if (!profile) return reply.code(409).send({ error: 'profile_required' });

      const conditions = parseConditions(profile.medicalConditions);
      if (hasExcludingCondition(conditions)) {
        return reply.code(409).send({ error: 'medical_block', conditions });
      }

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
          prepMinutes: true,
          ingredients: { select: { ingredient: { select: { exclusionGroups: true } } } },
        },
      });

      const candidates: RecipeCandidate[] = recipes.map((r) => {
        const tags = new Set<string>();
        for (const ri of r.ingredients) for (const g of ri.ingredient.exclusionGroups) tags.add(g);
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          kcal: r.kcal,
          proteinG: r.proteinG,
          fatG: r.fatG,
          netCarbG: r.netCarbG,
          exclusionTags: Array.from(tags),
          phases: r.phases.filter((p): p is 1 | 2 | 3 => p === 1 || p === 2 || p === 3),
          prepMinutes: r.prepMinutes,
        };
      });

      const weightCurrentKg = Number(profile.weightCurrentKg);
      const bodyFatPct = profile.bodyFatPct ? Number(profile.bodyFatPct) : null;
      let bmr = bodyFatPct
        ? calculateBmrKatchMcArdle(weightCurrentKg, bodyFatPct)
        : calculateBmr({
            weightKg: weightCurrentKg,
            heightCm: profile.heightCm,
            ageYears: profile.age,
            gender: profile.gender,
          });
      bmr *= bmrAdjustmentForConditions(conditions);
      bmr *= bmrAdjustForDietHistory(profile.dietHistory as DietHistory | null);
      const tdee = calculateTdee(bmr, profile.activityLevel);
      const phaseInt = phaseToInt(profile.currentPhase);

      const { kcalTarget: baseKcal } = computeDailyKcalTarget({
        tdee,
        weightCurrentKg,
        targetWeeklyLossKg: profile.targetWeeklyLossKg,
        phase: phaseInt,
      });

      const fastingProtocol =
        (profile.user.preferences?.fastingProtocol as FastingProtocolKey | null | undefined) ??
        null;
      const dayPlan = protocolPlanForDay(fastingProtocol, slot.dayOfWeek);
      const mealsPerDay = profile.user.preferences?.mealsPerDay ?? null;
      const effectiveShare =
        !fastingProtocol && mealsPerDay ? mealShareForFrequency(mealsPerDay) : dayPlan.share;

      // Allenamento — extra del giorno se è training day.
      const trainingDays = profile.user.preferences?.trainingDays ?? [];
      const trainingType =
        (profile.user.preferences?.trainingType as TrainingType | null | undefined) ?? null;
      const sessionMinutes = profile.user.preferences?.sessionMinutes ?? null;
      const trainingExtra =
        isTrainingDay(slot.dayOfWeek, trainingDays) && trainingType && sessionMinutes
          ? extraKcalForSession({
              type: trainingType,
              durationMinutes: sessionMinutes,
              weightKg: weightCurrentKg,
            })
          : 0;
      const dailyKcal = Math.round(baseKcal * dayPlan.kcalMultiplier + trainingExtra);
      const dailyTarget = macrosForPhase({
        kcalTarget: dailyKcal,
        weightKg: weightCurrentKg,
        phase: phaseInt,
      });

      // Macros già consumati negli altri pasti dello stesso giorno.
      const sameDay = slot.plan.slots.filter(
        (s) => s.dayOfWeek === slot.dayOfWeek && s.id !== slot.id && s.selected,
      );
      const consumedSoFar = sameDay.reduce(
        (acc, s) => ({
          kcal: acc.kcal + (s.selected?.kcal ?? 0),
          proteinG: acc.proteinG + (s.selected?.proteinG ?? 0),
          fatG: acc.fatG + (s.selected?.fatG ?? 0),
          netCarbG: acc.netCarbG + (s.selected?.netCarbG ?? 0),
        }),
        { kcal: 0, proteinG: 0, fatG: 0, netCarbG: 0 },
      );

      const exclusions = profile.user.preferences?.exclusions ?? [];
      const cookingTime =
        (profile.user.preferences?.cookingTime as 'LOW' | 'MEDIUM' | 'HIGH' | null | undefined) ??
        null;

      // Le ricette già scelte negli ultimi 2 giorni + lo slot corrente sono "recenti".
      const recentlyConsumedIds = slot.plan.slots
        .filter((s) => slot.dayOfWeek - s.dayOfWeek <= 2 && s.id !== slot.id && s.recipeId != null)
        .map((s) => s.recipeId as string);
      // Aggiungo anche la ricetta attualmente scelta in questo slot per
      // forzare il matchmaking a proporne un'altra al primo posto.
      if (slot.recipeId) recentlyConsumedIds.push(slot.recipeId);

      const top = matchMeals({
        candidates,
        meal: slot.meal,
        phase: phaseInt,
        excludedTags: exclusions,
        recentlyConsumedIds,
        consumedSoFar,
        dailyTarget,
        mealShare: effectiveShare,
        maxPrepMinutes: maxPrepMinutesFor(cookingTime),
        topN: 5,
      });

      if (top.length === 0) {
        return reply.code(409).send({ error: 'no_recipes_available' });
      }

      const newSelected = top[0];
      const altIds = top.slice(1).map((r) => r.id);

      // Re-set alternatives via Prisma `set` per pulire la M2M.
      await fastify.prisma.mealSlot.update({
        where: { id: slotId },
        data: {
          recipeId: newSelected.id,
          alternatives: { set: altIds.map((id) => ({ id })) },
        },
      });

      return reply.code(200).send({
        slot: { id: slotId, recipeId: newSelected.id, alternativeIds: altIds },
      });
    },
  );

  fastify.get('/me/meal-plans/current', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;
    const [plan, prefs] = await Promise.all([
      fastify.prisma.mealPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { weekStart: 'desc' },
        include: {
          slots: {
            include: {
              selected: {
                select: {
                  id: true,
                  name: true,
                  kcal: true,
                  proteinG: true,
                  fatG: true,
                  netCarbG: true,
                  prepMinutes: true,
                },
              },
              alternatives: {
                select: {
                  id: true,
                  name: true,
                  kcal: true,
                  proteinG: true,
                  fatG: true,
                  netCarbG: true,
                  prepMinutes: true,
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { meal: 'asc' }],
          },
        },
      }),
      fastify.prisma.preferences.findUnique({
        where: { userId },
        select: { fastingProtocol: true },
      }),
    ]);
    if (!plan) return reply.code(404).send({ error: 'plan_not_found' });
    return {
      plan: {
        id: plan.id,
        weekStart: plan.weekStart.toISOString().slice(0, 10),
        slots: plan.slots,
        fastingProtocol: prefs?.fastingProtocol ?? null,
      },
    };
  });
};
