import { z } from 'zod';

import { MEDICAL_CONDITIONS } from '../medical/conditions.js';

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
  // Velocità di calo desiderata (kg/sett.). Cap 0.25-1.5 per UI; il backend
  // applica anche un cap di sicurezza dinamico in base al peso.
  targetWeeklyLossKg: z.coerce.number().min(0.1).max(1.5).optional(),
  // Condizioni mediche dichiarate. Le "escludenti" bloccano la generazione piano.
  medicalConditions: z.array(z.enum(MEDICAL_CONDITIONS)).max(20).optional(),
  // Circonferenza collo: serve alla formula US Navy per stimare la BF%.
  neckCm: z.coerce.number().min(20).max(60).optional(),
  waistCm: z.coerce.number().min(40).max(200).optional(),
  hipsCm: z.coerce.number().min(40).max(200).optional(),
});

export type ProfileInput = z.input<typeof profileInputSchema>;
export type ProfileInputParsed = z.output<typeof profileInputSchema>;
