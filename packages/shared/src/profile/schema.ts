import { z } from 'zod';

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const ACTIVITY_LEVELS = ['SEDENTARY', 'LIGHT', 'MODERATE', 'INTENSE'] as const;

export const profileInputSchema = z.object({
  age: z.coerce.number().int().min(18, 'Devi avere almeno 18 anni').max(110),
  gender: z.enum(GENDERS),
  heightCm: z.coerce.number().int().min(120).max(230),
  weightStartKg: z.coerce.number().min(35).max(300),
  weightCurrentKg: z.coerce.number().min(35).max(300),
  weightGoalKg: z.coerce.number().min(35).max(300),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  targetDate: z.coerce.date().optional(),
});

export type ProfileInput = z.input<typeof profileInputSchema>;
export type ProfileInputParsed = z.output<typeof profileInputSchema>;
