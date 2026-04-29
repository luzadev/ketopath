// PRD §5.1 — Composizione corporea e BMR Katch-McArdle.
//
// US Navy formula per la stima del % grasso corporeo da circonferenze.
// Più accurata di Mifflin per persone con composizione fuori-norma (atleti,
// over-fat). Una volta nota la BF%, BMR viene calcolato sulla massa magra
// (FFM) che è il driver metabolico reale.

import type { Gender } from './types.js';

export interface UsNavyInput {
  gender: Gender;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipsCm?: number; // richiesto per FEMALE / OTHER
}

/**
 * Stima la % grasso corporeo con la formula US Navy (1981).
 * Range tipico: 8-30% uomini, 18-40% donne. Errore ±3-4%.
 *
 * Per Gender 'OTHER' usiamo la formula femminile (più conservativa) se
 * `hipsCm` è fornita, altrimenti quella maschile.
 */
export function estimateBodyFatPercentageUSNavy(input: UsNavyInput): number {
  const { gender, heightCm, neckCm, waistCm, hipsCm } = input;
  if (heightCm <= 0 || neckCm <= 0 || waistCm <= 0) {
    throw new RangeError('heightCm, neckCm, waistCm must be positive');
  }

  // Formule US Navy in unità metriche (Hodgdon-Beckett 1984, conversione SI).
  const useFemale = gender === 'FEMALE' || (gender === 'OTHER' && hipsCm != null);
  if (useFemale) {
    if (hipsCm == null || hipsCm <= 0) {
      throw new RangeError('hipsCm is required for FEMALE');
    }
    // BF% = 495 / (1.29579 − 0.35004 × log10(waist + hips − neck) + 0.22100 × log10(height)) − 450
    const denom =
      1.29579 - 0.35004 * Math.log10(waistCm + hipsCm - neckCm) + 0.221 * Math.log10(heightCm);
    return clampBodyFat(495 / denom - 450);
  }
  // Maschile: BF% = 495 / (1.0324 − 0.19077 × log10(waist − neck) + 0.15456 × log10(height)) − 450
  const denom = 1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm);
  return clampBodyFat(495 / denom - 450);
}

function clampBodyFat(v: number): number {
  if (Number.isNaN(v)) throw new Error('invalid body fat estimate');
  return Math.max(3, Math.min(60, Number(v.toFixed(1))));
}

/**
 * BMR con la formula Katch-McArdle, basata sulla FFM.
 * Più accurata di Mifflin quando la BF% è nota.
 *
 *   BMR = 370 + 21.6 × FFM_kg
 */
export function calculateBmrKatchMcArdle(weightKg: number, bodyFatPct: number): number {
  if (weightKg <= 0 || bodyFatPct < 0 || bodyFatPct >= 100) {
    throw new RangeError('weightKg must be positive, bodyFatPct in [0, 100)');
  }
  const ffm = weightKg * (1 - bodyFatPct / 100);
  return 370 + 21.6 * ffm;
}
