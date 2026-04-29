import type { Gender } from './types.js';

export interface BmrInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: Gender;
}

// Mifflin-St Jeor equation. For Gender 'OTHER' we use the average of the
// male and female sex-specific constants (-78), as a neutral approximation.
export function calculateBmr({ weightKg, heightCm, ageYears, gender }: BmrInput): number {
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    throw new RangeError('weightKg, heightCm and ageYears must be positive');
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;

  switch (gender) {
    case 'MALE':
      return base + 5;
    case 'FEMALE':
      return base - 161;
    case 'OTHER':
      return base - 78;
  }
}
