// PRD §5.1 — Schedule allenamento. Sui giorni di allenamento il fabbisogno
// energetico aumenta: stimiamo l'energy expenditure (EE) della sessione con
// l'equazione MET classica (Ainsworth 2011).
//
//   EE_kcal = MET × peso_kg × ore
//
// I MET prevalenti per tipo (medie ragionevoli):
//   - CARDIO   ≈ 8 (corsa moderata 8 km/h, ciclismo 20 km/h)
//   - STRENGTH ≈ 5 (allenamento pesi vigoroso)
//   - MIXED    ≈ 6 (HIIT/cross-training)
//   - SPORT    ≈ 7 (calcio amatoriale, tennis singolo)

export const TRAINING_TYPES = ['CARDIO', 'STRENGTH', 'MIXED', 'SPORT'] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

const MET_BY_TYPE: Record<TrainingType, number> = {
  CARDIO: 8,
  STRENGTH: 5,
  MIXED: 6,
  SPORT: 7,
};

export interface TrainingSessionInput {
  type: TrainingType;
  durationMinutes: number;
  weightKg: number;
}

/**
 * Stima delle kcal extra spese in una sessione di allenamento.
 * Output arrotondato a multipli di 25 per evitare false-precisioni.
 */
export function extraKcalForSession({
  type,
  durationMinutes,
  weightKg,
}: TrainingSessionInput): number {
  if (durationMinutes <= 0 || weightKg <= 0) return 0;
  const met = MET_BY_TYPE[type];
  const kcal = met * weightKg * (durationMinutes / 60);
  return Math.round(kcal / 25) * 25;
}

export function isTrainingDay(dayOfWeek: number, trainingDays: readonly number[]): boolean {
  return trainingDays.includes(dayOfWeek);
}
