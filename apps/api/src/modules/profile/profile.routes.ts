import {
  ACTIVITY_MULTIPLIERS,
  calculateBmr,
  calculateBmrKatchMcArdle,
  calculateTdee,
  estimateBodyFatPercentageUSNavy,
  profileInputSchema,
  type ActivityLevel,
  type Gender,
} from '@ketopath/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../../plugins/auth.js';

// The weight columns are encrypted at rest (ADR 0002) and therefore stored
// as String. The Zod input schema parses numeric strings → numbers, but the
// Prisma row keeps them as strings — so serialize/parse explicitly here.
function serialize(
  profile: {
    age: number;
    gender: Gender;
    heightCm: number;
    weightStartKg: string;
    weightCurrentKg: string;
    weightGoalKg: string;
    activityLevel: ActivityLevel;
    targetDate: string | null;
    targetWeeklyLossKg: number | null;
    medicalConditions: string | null;
    bodyFatPct: string | null;
    currentPhase: string;
  } | null,
) {
  if (!profile) return null;
  const weightCurrentKg = Number(profile.weightCurrentKg);
  const bodyFatPct = profile.bodyFatPct ? Number(profile.bodyFatPct) : null;
  const bmr = bodyFatPct
    ? calculateBmrKatchMcArdle(weightCurrentKg, bodyFatPct)
    : calculateBmr({
        weightKg: weightCurrentKg,
        heightCm: profile.heightCm,
        ageYears: profile.age,
        gender: profile.gender,
      });
  const tdee = calculateTdee(bmr, profile.activityLevel);
  return {
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    weightStartKg: Number(profile.weightStartKg),
    weightCurrentKg,
    weightGoalKg: Number(profile.weightGoalKg),
    activityLevel: profile.activityLevel,
    targetDate: profile.targetDate,
    targetWeeklyLossKg: profile.targetWeeklyLossKg,
    medicalConditions: parseConditions(profile.medicalConditions),
    bodyFatPct,
    currentPhase: profile.currentPhase,
    derived: {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      activityMultiplier: ACTIVITY_MULTIPLIERS[profile.activityLevel],
      bmrFormula: bodyFatPct ? 'katch_mcardle' : 'mifflin_st_jeor',
    },
  };
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

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/profile', { preHandler: requireAuth() }, async (request, reply) => {
    const profile = await fastify.prisma.profile.findUnique({
      where: { userId: request.user!.id },
    });
    if (!profile) return reply.code(404).send({ error: 'profile_not_found' });
    return { profile: serialize(profile) };
  });

  fastify.put('/me/profile', { preHandler: requireAuth() }, async (request, reply) => {
    const parsed = profileInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const data = parsed.data;
    const userId = request.user!.id;

    const targetDateStr = data.targetDate ? data.targetDate.toISOString().slice(0, 10) : null;

    // Stima %BF se le misure essenziali sono tutte presenti.
    let bodyFatPct: string | null = null;
    if (data.neckCm && data.waistCm) {
      try {
        const pct = estimateBodyFatPercentageUSNavy({
          gender: data.gender,
          heightCm: data.heightCm,
          neckCm: data.neckCm,
          waistCm: data.waistCm,
          ...(data.hipsCm != null ? { hipsCm: data.hipsCm } : {}),
        });
        bodyFatPct = String(pct);
      } catch {
        bodyFatPct = null; // input fuori range → nessuna stima
      }
    }

    const conditionsJson = data.medicalConditions ? JSON.stringify(data.medicalConditions) : null;

    const profile = await fastify.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        weightStartKg: String(data.weightStartKg),
        weightCurrentKg: String(data.weightCurrentKg),
        weightGoalKg: String(data.weightGoalKg),
        activityLevel: data.activityLevel,
        targetDate: targetDateStr,
        targetWeeklyLossKg: data.targetWeeklyLossKg ?? null,
        medicalConditions: conditionsJson,
        bodyFatPct,
      },
      update: {
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        weightStartKg: String(data.weightStartKg),
        weightCurrentKg: String(data.weightCurrentKg),
        weightGoalKg: String(data.weightGoalKg),
        activityLevel: data.activityLevel,
        targetDate: targetDateStr,
        targetWeeklyLossKg: data.targetWeeklyLossKg ?? null,
        medicalConditions: conditionsJson,
        // Se l'utente ricalcola con misure nuove, sovrascriviamo; altrimenti
        // lasciamo il valore precedente.
        ...(bodyFatPct != null ? { bodyFatPct } : {}),
      },
    });

    return { profile: serialize(profile) };
  });

  // PATCH dedicato per le condizioni mediche: l'onboarding lo usa per salvare
  // solo questo delta senza richiedere tutti i campi obbligatori del PUT.
  fastify.patch('/me/profile/conditions', { preHandler: requireAuth() }, async (request, reply) => {
    const body = request.body as { conditions?: unknown };
    if (!Array.isArray(body.conditions)) {
      return reply.code(400).send({ error: 'invalid_body' });
    }
    const conditions = body.conditions.filter((c): c is string => typeof c === 'string');
    const userId = request.user!.id;
    const existing = await fastify.prisma.profile.findUnique({ where: { userId } });
    if (!existing) return reply.code(404).send({ error: 'profile_not_found' });
    await fastify.prisma.profile.update({
      where: { userId },
      data: { medicalConditions: JSON.stringify(conditions) },
    });
    return { conditions };
  });
};
