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

function serialize(
  profile: {
    age: number;
    gender: Gender;
    heightCm: number;
    weightStartKg: { toNumber(): number };
    weightCurrentKg: { toNumber(): number };
    weightGoalKg: { toNumber(): number };
    activityLevel: ActivityLevel;
    targetDate: Date | null;
    currentPhase: string;
  } | null,
) {
  if (!profile) return null;
  const weightCurrentKg = profile.weightCurrentKg.toNumber();
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
    weightStartKg: profile.weightStartKg.toNumber(),
    weightCurrentKg,
    weightGoalKg: profile.weightGoalKg.toNumber(),
    activityLevel: profile.activityLevel,
    targetDate: profile.targetDate?.toISOString() ?? null,
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

    const profile = await fastify.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        weightStartKg: data.weightStartKg,
        weightCurrentKg: data.weightCurrentKg,
        weightGoalKg: data.weightGoalKg,
        activityLevel: data.activityLevel,
        targetDate: data.targetDate ?? null,
      },
      update: {
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        weightStartKg: data.weightStartKg,
        weightCurrentKg: data.weightCurrentKg,
        weightGoalKg: data.weightGoalKg,
        activityLevel: data.activityLevel,
        targetDate: data.targetDate ?? null,
      },
    });

    return { profile: serialize(profile) };
  });
};
