import { describe, expect, it } from 'vitest';

import {
  currentPhase2Week,
  freeMealKcalAdjustment,
  isRecipeAllowedForPhaseWeek,
  weeksSince,
} from './phase-progression.js';

describe('weeksSince / currentPhase2Week', () => {
  it('oggi → 0 settimane intere; current = 1', () => {
    const today = new Date();
    expect(weeksSince(today)).toBe(0);
    expect(currentPhase2Week(today)).toBe(1);
  });

  it('14 giorni fa → 2 settimane; current = 3', () => {
    const start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(weeksSince(start)).toBe(2);
    expect(currentPhase2Week(start)).toBe(3);
  });

  it('null → settimana 1', () => {
    expect(currentPhase2Week(null)).toBe(1);
    expect(currentPhase2Week(undefined)).toBe(1);
  });
});

describe('isRecipeAllowedForPhaseWeek', () => {
  const lentils = { phase2Week: 3 };
  const oliveOil = { phase2Week: null };
  const apple = { phase2Week: 5 };

  it('Fase 1 → tutto permesso', () => {
    expect(isRecipeAllowedForPhaseWeek([lentils, apple], 1, 1)).toBe(true);
  });

  it('Fase 3 → tutto permesso', () => {
    expect(isRecipeAllowedForPhaseWeek([lentils, apple], 3, 1)).toBe(true);
  });

  it('Fase 2 settimana 2 → ricetta con lenticchie (week 3) bloccata', () => {
    expect(isRecipeAllowedForPhaseWeek([lentils, oliveOil], 2, 2)).toBe(false);
  });

  it('Fase 2 settimana 3 → ricetta con lenticchie sblocca', () => {
    expect(isRecipeAllowedForPhaseWeek([lentils, oliveOil], 2, 3)).toBe(true);
  });

  it('Fase 2 settimana 4 → mela ancora bloccata (week 5)', () => {
    expect(isRecipeAllowedForPhaseWeek([apple], 2, 4)).toBe(false);
  });
});

describe('freeMealKcalAdjustment', () => {
  it('free meal a 750 invece di 500 → spalma -250 sui rimanenti', () => {
    const adj = freeMealKcalAdjustment({
      freeMealKcal: 750,
      originalSlotKcal: 500,
      remainingSlots: 5,
    });
    // delta = 250, perSlot = 50, adjustment = -50
    expect(adj).toBe(-50);
  });

  it('cap di sicurezza a -200 kcal/pasto', () => {
    const adj = freeMealKcalAdjustment({
      freeMealKcal: 2000,
      originalSlotKcal: 500,
      remainingSlots: 3,
    });
    // perSlot = 500, ma cap -200
    expect(adj).toBe(-200);
  });

  it('free meal più piccolo del normale → leggero +', () => {
    const adj = freeMealKcalAdjustment({
      freeMealKcal: 300,
      originalSlotKcal: 500,
      remainingSlots: 4,
    });
    // delta = -200, perSlot = -50, adjustment = +50 (cap)
    expect(adj).toBe(50);
  });

  it('remainingSlots 0 → 0', () => {
    expect(
      freeMealKcalAdjustment({ freeMealKcal: 750, originalSlotKcal: 500, remainingSlots: 0 }),
    ).toBe(0);
  });
});
