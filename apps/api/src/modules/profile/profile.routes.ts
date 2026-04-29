import {
  ACTIVITY_MULTIPLIERS,
  calculateBmr,
  calculateTdee,
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
    currentPhase: string;
  } | null,
) {
  if (!profile) return null;
  const weightCurrentKg = Number(profile.weightCurrentKg);
  const bmr = calculateBmr({
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
    currentPhase: profile.currentPhase,
    derived: {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      activityMultiplier: ACTIVITY_MULTIPLIERS[profile.activityLevel],
    },
  };
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
      },
    });

    return { profile: serialize(profile) };
  });
};
