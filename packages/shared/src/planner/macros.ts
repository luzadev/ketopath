import { type Phase } from './types.js';

// PRD §9.3 — distribuzione macro per fase.
// Ritorna i target giornalieri (kcal/proteine/grassi/carboidrati netti) date
// le calorie totali del giorno e la fase.
export interface DailyMacros {
  kcal: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
}

export interface PhaseMacroInput {
  kcalTarget: number;
  weightKg: number;
  phase: Phase;
}

const KCAL_PER_GRAM = { protein: 4, fat: 9, netCarb: 4 } as const;

export function macrosForPhase({ kcalTarget, weightKg, phase }: PhaseMacroInput): DailyMacros {
  // Proteine: 1.6 g/kg di peso ideale, leggermente più alte in fase 1.
  const proteinPerKg = phase === 1 ? 1.8 : 1.6;
  const proteinG = Math.round(weightKg * proteinPerKg);

  // Carboidrati netti per fase (PRD §9.3).
  const netCarbG = phase === 1 ? 25 : phase === 2 ? 60 : 120;

  // Grassi: il resto.
  const proteinKcal = proteinG * KCAL_PER_GRAM.protein;
  const carbKcal = netCarbG * KCAL_PER_GRAM.netCarb;
  const fatKcal = Math.max(0, kcalTarget - proteinKcal - carbKcal);
  const fatG = Math.round(fatKcal / KCAL_PER_GRAM.fat);

  return { kcal: kcalTarget, proteinG, fatG, netCarbG };
}
