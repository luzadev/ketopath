import { describe, expect, it } from 'vitest';

import { calculateBmr } from './bmr.js';

describe('calculateBmr (Mifflin-St Jeor)', () => {
  it('matches the male formula for the "Michele" PRD persona', () => {
    // 49 anni, uomo, 76 kg, 170 cm
    // 10·76 + 6.25·170 − 5·49 + 5 = 760 + 1062.5 − 245 + 5 = 1582.5
    const bmr = calculateBmr({ weightKg: 76, heightCm: 170, ageYears: 49, gender: 'MALE' });
    expect(bmr).toBeCloseTo(1582.5, 2);
  });

  it('matches the female formula for the "Laura" PRD persona', () => {
    // 46 anni, donna, 70 kg, 165 cm
    // 10·70 + 6.25·165 − 5·46 − 161 = 700 + 1031.25 − 230 − 161 = 1340.25
    const bmr = calculateBmr({ weightKg: 70, heightCm: 165, ageYears: 46, gender: 'FEMALE' });
    expect(bmr).toBeCloseTo(1340.25, 2);
  });

  it('uses the average sex-constant for OTHER', () => {
    const male = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, gender: 'MALE' });
    const female = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, gender: 'FEMALE' });
    const other = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, gender: 'OTHER' });
    expect(other).toBeCloseTo((male + female) / 2, 5);
  });

  it.each([
    { weightKg: 0, heightCm: 170, ageYears: 30 },
    { weightKg: 70, heightCm: 0, ageYears: 30 },
    { weightKg: 70, heightCm: 170, ageYears: 0 },
    { weightKg: -1, heightCm: 170, ageYears: 30 },
  ])('rejects non-positive inputs %j', (input) => {
    expect(() => calculateBmr({ ...input, gender: 'MALE' })).toThrow(RangeError);
  });
});
