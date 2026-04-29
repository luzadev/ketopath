import { describe, expect, it } from 'vitest';

import { computeDailyKcalTarget } from './deficit.js';

describe('computeDailyKcalTarget', () => {
  it('mantenimento (fase 3) → kcal == TDEE, niente calo', () => {
    const r = computeDailyKcalTarget({
      tdee: 2200,
      weightCurrentKg: 80,
      phase: 3,
    });
    expect(r.kcalTarget).toBe(2200);
    expect(r.effectiveWeeklyLossKg).toBe(0);
    expect(r.cappedToSafe).toBe(false);
  });

  it('transizione (fase 2) → ~ -200 kcal', () => {
    const r = computeDailyKcalTarget({
      tdee: 2200,
      weightCurrentKg: 80,
      phase: 2,
    });
    expect(r.kcalTarget).toBe(2000);
  });

  it('intensiva 0.5 kg/sett → deficit ~550 kcal', () => {
    const r = computeDailyKcalTarget({
      tdee: 2200,
      weightCurrentKg: 80,
      targetWeeklyLossKg: 0.5,
      phase: 1,
    });
    expect(r.kcalTarget).toBe(2200 - Math.round((0.5 * 7700) / 7));
    expect(r.cappedToSafe).toBe(false);
  });

  it('cap 1% peso/settimana: chiede 1.2 kg su 80kg → effettivi 0.8 kg', () => {
    const r = computeDailyKcalTarget({
      tdee: 2200,
      weightCurrentKg: 80,
      targetWeeklyLossKg: 1.2,
      phase: 1,
    });
    expect(r.cappedToSafe).toBe(true);
    expect(r.effectiveWeeklyLossKg).toBeLessThanOrEqual(0.85);
  });

  it('cap 30% TDEE: persona piccola e impaziente non scende sotto soglia', () => {
    // 50 kg, TDEE 1500, vuole 1 kg/sett → richiederebbe deficit 1100/giorno
    // ma 30% di 1500 = 450 → cap.
    const r = computeDailyKcalTarget({
      tdee: 1500,
      weightCurrentKg: 50,
      targetWeeklyLossKg: 1,
      phase: 1,
    });
    expect(r.cappedToSafe).toBe(true);
    expect(r.kcalTarget).toBeGreaterThanOrEqual(Math.round(1500 * 0.7));
  });

  it('default 0.5 kg/sett quando manca targetWeeklyLossKg', () => {
    const r = computeDailyKcalTarget({
      tdee: 2200,
      weightCurrentKg: 80,
      phase: 1,
    });
    expect(r.kcalTarget).toBeLessThan(2200);
    expect(r.kcalTarget).toBeGreaterThan(2200 - 700);
  });
});
