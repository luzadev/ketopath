import { describe, expect, it } from 'vitest';

import { calculateBmrKatchMcArdle, estimateBodyFatPercentageUSNavy } from './body-composition.js';

describe('estimateBodyFatPercentageUSNavy', () => {
  it('uomo medio (180cm, vita 90, collo 38) ≈ 18-22% BF', () => {
    const bf = estimateBodyFatPercentageUSNavy({
      gender: 'MALE',
      heightCm: 180,
      neckCm: 38,
      waistCm: 90,
    });
    expect(bf).toBeGreaterThan(15);
    expect(bf).toBeLessThan(25);
  });

  it('donna media (165cm, vita 75, fianchi 100, collo 33) ≈ 25-32% BF', () => {
    const bf = estimateBodyFatPercentageUSNavy({
      gender: 'FEMALE',
      heightCm: 165,
      neckCm: 33,
      waistCm: 75,
      hipsCm: 100,
    });
    expect(bf).toBeGreaterThan(20);
    expect(bf).toBeLessThan(35);
  });

  it('uomo atletico (180cm, vita 80, collo 40) → BF basso (< 15%)', () => {
    const bf = estimateBodyFatPercentageUSNavy({
      gender: 'MALE',
      heightCm: 180,
      neckCm: 40,
      waistCm: 80,
    });
    expect(bf).toBeLessThan(15);
  });

  it('FEMALE senza hipsCm lancia errore', () => {
    expect(() =>
      estimateBodyFatPercentageUSNavy({
        gender: 'FEMALE',
        heightCm: 165,
        neckCm: 33,
        waistCm: 75,
      }),
    ).toThrow();
  });

  it('clamp BF% in [3, 60]', () => {
    const bf = estimateBodyFatPercentageUSNavy({
      gender: 'MALE',
      heightCm: 180,
      neckCm: 41,
      waistCm: 75, // input molto magro: senza clamp uscirebbe negativo
    });
    expect(bf).toBeGreaterThanOrEqual(3);
  });
});

describe('calculateBmrKatchMcArdle', () => {
  it('80kg con 20% BF → BMR ~1750', () => {
    const bmr = calculateBmrKatchMcArdle(80, 20);
    // FFM = 64, BMR = 370 + 21.6*64 = 1752.4
    expect(Math.round(bmr)).toBe(1752);
  });

  it('80kg con 30% BF → BMR < lo stesso peso al 20%', () => {
    expect(calculateBmrKatchMcArdle(80, 30)).toBeLessThan(calculateBmrKatchMcArdle(80, 20));
  });

  it('input negativi → errore', () => {
    expect(() => calculateBmrKatchMcArdle(-1, 20)).toThrow();
    expect(() => calculateBmrKatchMcArdle(80, 100)).toThrow();
  });
});
