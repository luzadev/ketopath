import { describe, expect, it } from 'vitest';

import { extraKcalForSession, isTrainingDay } from './training.js';

describe('extraKcalForSession', () => {
  it('cardio 60min @ 80kg ≈ 640 kcal (round 25)', () => {
    expect(extraKcalForSession({ type: 'CARDIO', durationMinutes: 60, weightKg: 80 })).toBe(650);
  });

  it('strength 60min @ 80kg ≈ 400 kcal', () => {
    expect(extraKcalForSession({ type: 'STRENGTH', durationMinutes: 60, weightKg: 80 })).toBe(400);
  });

  it('mixed 45min @ 70kg', () => {
    const r = extraKcalForSession({ type: 'MIXED', durationMinutes: 45, weightKg: 70 });
    expect(r).toBeGreaterThan(250);
    expect(r).toBeLessThan(400);
  });

  it('durata o peso non positivi → 0', () => {
    expect(extraKcalForSession({ type: 'CARDIO', durationMinutes: 0, weightKg: 80 })).toBe(0);
    expect(extraKcalForSession({ type: 'CARDIO', durationMinutes: 60, weightKg: 0 })).toBe(0);
  });
});

describe('isTrainingDay', () => {
  it('mercoledì in [0,2,4]', () => {
    expect(isTrainingDay(2, [0, 2, 4])).toBe(true);
    expect(isTrainingDay(1, [0, 2, 4])).toBe(false);
  });
});
