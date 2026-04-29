import { z } from 'zod';

export const FASTING_PROTOCOLS = [
  'FOURTEEN_TEN',
  'SIXTEEN_EIGHT',
  'EIGHTEEN_SIX',
  'TWENTY_FOUR',
  'ESE_24',
  'FIVE_TWO',
] as const;

export const FAST_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'ABORTED'] as const;

const measurementsSchema = z
  .object({
    waistCm: z.coerce.number().min(40).max(200).optional(),
    hipsCm: z.coerce.number().min(40).max(200).optional(),
    thighCm: z.coerce.number().min(20).max(120).optional(),
    armCm: z.coerce.number().min(15).max(80).optional(),
  })
  .strict();

// PRD §5.2 — check-in lampo quotidiano. Form 10-secondi: solo soggettivi.
export const dailyCheckInInputSchema = z.object({
  date: z.coerce.date(),
  energy: z.coerce.number().int().min(1).max(10).optional(),
  sleep: z.coerce.number().int().min(1).max(10).optional(),
  hunger: z.coerce.number().int().min(1).max(10).optional(),
  mood: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

export type DailyCheckInInput = z.input<typeof dailyCheckInInputSchema>;

export const weightEntryInputSchema = z.object({
  date: z.coerce.date(),
  weightKg: z.coerce.number().min(35).max(300),
  measurements: measurementsSchema.optional(),
  notes: z.string().max(1000).optional(),
  energy: z.coerce.number().int().min(1).max(10).optional(),
  sleep: z.coerce.number().int().min(1).max(10).optional(),
  hunger: z.coerce.number().int().min(1).max(10).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
});

export type WeightEntryInput = z.input<typeof weightEntryInputSchema>;

const symptomsSchema = z
  .object({
    headache: z.boolean().optional(),
    energy: z.coerce.number().int().min(1).max(10).optional(),
    hunger: z.coerce.number().int().min(1).max(10).optional(),
    clarity: z.coerce.number().int().min(1).max(10).optional(),
    other: z.string().max(500).optional(),
  })
  .strict();

export const fastEventStartSchema = z.object({
  protocol: z.enum(FASTING_PROTOCOLS),
  startedAt: z.coerce.date().optional(),
  targetDuration: z.coerce.number().int().positive().optional(),
});

export const fastEventUpdateSchema = z.object({
  endedAt: z.coerce.date().optional(),
  status: z.enum(FAST_STATUSES).optional(),
  symptoms: symptomsSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export type FastEventStartInput = z.input<typeof fastEventStartSchema>;
export type FastEventUpdateInput = z.input<typeof fastEventUpdateSchema>;

// Default targetDuration in minutes per protocol.
export const PROTOCOL_DEFAULT_MINUTES: Record<(typeof FASTING_PROTOCOLS)[number], number> = {
  FOURTEEN_TEN: 14 * 60,
  SIXTEEN_EIGHT: 16 * 60,
  EIGHTEEN_SIX: 18 * 60,
  TWENTY_FOUR: 20 * 60,
  ESE_24: 24 * 60,
  FIVE_TWO: 24 * 60,
};
