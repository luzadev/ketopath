import { z } from 'zod';

import { TRAINING_TYPES } from './training.js';

// PRD §5.1 — gruppi di esclusione legati agli ingredienti.
// Devono coincidere con i tag su `Ingredient.exclusionGroups` nel seed
// (vedi packages/db/prisma/seed-ingredients.ts).
export const EXCLUSION_GROUPS = [
  'lactose',
  'egg',
  'fish',
  'nuts',
  'gluten',
  'pork',
  'beef',
] as const;
export type ExclusionGroup = (typeof EXCLUSION_GROUPS)[number];

// Tradizioni regionali italiane + low-carb internazionali.
// Per ora informative: il matchmaking ne tiene conto solo come bonus.
export const CUISINE_TAGS = [
  'mediterranea',
  'italiana',
  'pugliese',
  'siciliana',
  'toscana',
  'medio-orientale',
  'nordica',
] as const;
export type CuisineTag = (typeof CUISINE_TAGS)[number];

export const COOKING_TIMES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type CookingTimeLevel = (typeof COOKING_TIMES)[number];

export const FASTING_PROTOCOL_VALUES = [
  'FOURTEEN_TEN',
  'SIXTEEN_EIGHT',
  'EIGHTEEN_SIX',
  'TWENTY_FOUR',
  'ESE_24',
  'FIVE_TWO',
] as const;

export const preferencesPatchSchema = z
  .object({
    exclusions: z.array(z.enum(EXCLUSION_GROUPS)).max(EXCLUSION_GROUPS.length).optional(),
    cuisinePreferences: z.array(z.enum(CUISINE_TAGS)).max(CUISINE_TAGS.length).optional(),
    cookingTime: z.enum(COOKING_TIMES).optional(),
    fastingProtocol: z.enum(FASTING_PROTOCOL_VALUES).nullable().optional(),
    // Schedule allenamento (vedi preferences/training.ts).
    trainingDays: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional(),
    trainingType: z.enum(TRAINING_TYPES).nullable().optional(),
    sessionMinutes: z.coerce.number().int().min(10).max(240).nullable().optional(),
    // Pasti/giorno preferiti. Il fastingProtocol ha precedenza.
    mealsPerDay: z.coerce.number().int().min(1).max(4).nullable().optional(),
    // PRD §6 — esclusioni granulari su singoli ingredient. Cap a 50 per evitare
    // di soffocare il matchmaking (in pratica più di così è una dieta diversa).
    bannedIngredientIds: z.array(z.string().min(1).max(120)).max(50).optional(),
  })
  .strict();

export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
