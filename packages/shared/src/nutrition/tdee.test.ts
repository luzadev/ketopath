import { describe, expect, it } from 'vitest';

import { calculateBmr } from './bmr.js';
import { calculateTdee } from './tdee.js';

describe('calculateTdee', () => {
  it('multiplies BMR by sedentary factor 1.2 for "Michele"', () => {
    const bmr = calculateBmr({ weightKg: 76, heightCm: 170, ageYears: 49, gender: 'MALE' });
    expect(calculateTdee(bmr, 'SEDENTARY')).toBeCloseTo(1899, 1);
  });

  it('multiplies BMR by moderate factor 1.55 for "Laura"', () => {
    const bmr = calculateBmr({ weightKg: 70, heightCm: 165, ageYears: 46, gender: 'FEMALE' });
    expect(calculateTdee(bmr, 'MODERATE')).toBeCloseTo(2077.39, 2);
  });

  it.each([
    ['SEDENTARY', 1.2],
    ['LIGHT', 1.375],
    ['MODERATE', 1.55],
    ['INTENSE', 1.725],
  ] as const)('applies the %s multiplier (%f)', (level, factor) => {
    expect(calculateTdee(2000, level)).toBeCloseTo(2000 * factor, 5);
  });

  it('rejects non-positive BMR', () => {
    expect(() => calculateTdee(0, 'SEDENTARY')).toThrow(RangeError);
    expect(() => calculateTdee(-1, 'SEDENTARY')).toThrow(RangeError);
  });
});
