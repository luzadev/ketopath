import { describe, expect, it } from 'vitest';

import { linearWeightTrend, projectGoalDate } from './weight-trend.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;

describe('linearWeightTrend', () => {
  it('vuoto → null', () => {
    expect(linearWeightTrend([])).toBeNull();
  });

  it('1 punto → slope 0', () => {
    const t = linearWeightTrend([{ date: new Date(), weightKg: 80 }]);
    expect(t?.slopeKgPerWeek).toBe(0);
    expect(t?.interceptKg).toBe(80);
  });

  it('serie discendente perfetta: -0.5 kg/settimana', () => {
    const t0 = new Date('2026-01-01').getTime();
    const points = [0, 1, 2, 3, 4].map((w) => ({
      date: new Date(t0 + w * WEEK),
      weightKg: 80 - 0.5 * w,
    }));
    const t = linearWeightTrend(points);
    expect(t?.slopeKgPerWeek).toBeCloseTo(-0.5, 4);
    expect(t?.interceptKg).toBeCloseTo(80, 4);
  });

  it('serie ascendente: slope positivo', () => {
    const t0 = new Date('2026-01-01').getTime();
    const points = [
      { date: new Date(t0), weightKg: 70 },
      { date: new Date(t0 + WEEK), weightKg: 70.3 },
      { date: new Date(t0 + 2 * WEEK), weightKg: 70.7 },
    ];
    const t = linearWeightTrend(points);
    expect(t?.slopeKgPerWeek).toBeGreaterThan(0);
  });
});

describe('projectGoalDate', () => {
  const now = new Date('2026-04-29T00:00:00Z');

  it('slope 0 → null', () => {
    expect(projectGoalDate({ currentKg: 80, goalKg: 75, slopeKgPerWeek: 0, now })).toBeNull();
  });

  it('trend va nella direzione giusta → data nel futuro', () => {
    const date = projectGoalDate({
      currentKg: 80,
      goalKg: 75,
      slopeKgPerWeek: -0.5,
      now,
    });
    expect(date).not.toBeNull();
    // 5 kg / 0.5 = 10 settimane
    const expectedMs = now.getTime() + 10 * WEEK;
    expect(Math.abs(date!.getTime() - expectedMs)).toBeLessThan(1000);
  });

  it('trend opposto → null (segno contrario)', () => {
    expect(projectGoalDate({ currentKg: 80, goalKg: 75, slopeKgPerWeek: 0.3, now })).toBeNull();
  });

  it('oltre 52 settimane → null', () => {
    expect(projectGoalDate({ currentKg: 80, goalKg: 75, slopeKgPerWeek: -0.05, now })).toBeNull();
  });

  it('currentKg == goalKg → now', () => {
    const r = projectGoalDate({ currentKg: 75, goalKg: 75, slopeKgPerWeek: -0.5, now });
    expect(r).toEqual(now);
  });
});
