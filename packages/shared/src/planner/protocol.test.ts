import { describe, expect, it } from 'vitest';

import { DEFAULT_MEAL_SHARE, protocolPlanForDay } from './matchmaking.js';

describe('protocolPlanForDay', () => {
  it('ritorna il default quando il protocollo non è impostato', () => {
    const r = protocolPlanForDay(null, 0);
    expect(r.share).toEqual(DEFAULT_MEAL_SHARE);
    expect(r.kcalMultiplier).toBe(1);
  });

  it('14:10 lascia tutti i quattro pasti uguali al default', () => {
    for (let day = 0; day < 7; day++) {
      const r = protocolPlanForDay('FOURTEEN_TEN', day);
      expect(r.share).toEqual(DEFAULT_MEAL_SHARE);
      expect(r.kcalMultiplier).toBe(1);
    }
  });

  it('16:8 azzera la colazione e mantiene 8h di alimentazione', () => {
    const r = protocolPlanForDay('SIXTEEN_EIGHT', 0);
    expect(r.share.COLAZIONE).toBe(0);
    expect(r.share.PRANZO + r.share.SPUNTINO + r.share.CENA).toBeCloseTo(1, 5);
    expect(r.kcalMultiplier).toBe(1);
  });

  it('18:6 azzera la colazione e tiene lo spuntino piccolo', () => {
    const r = protocolPlanForDay('EIGHTEEN_SIX', 0);
    expect(r.share.COLAZIONE).toBe(0);
    expect(r.share.SPUNTINO).toBeLessThan(0.1);
    expect(r.share.PRANZO + r.share.SPUNTINO + r.share.CENA).toBeCloseTo(1, 5);
  });

  it('20:4 lascia praticamente solo la cena', () => {
    const r = protocolPlanForDay('TWENTY_FOUR', 0);
    expect(r.share.COLAZIONE).toBe(0);
    expect(r.share.PRANZO).toBe(0);
    expect(r.share.CENA).toBeGreaterThan(0.8);
  });

  it('ESE_24 mette il mercoledì a digiuno completo, gli altri normali', () => {
    const wed = protocolPlanForDay('ESE_24', 2);
    expect(wed.kcalMultiplier).toBe(0);
    expect(wed.share).toEqual({ COLAZIONE: 0, PRANZO: 0, SPUNTINO: 0, CENA: 0 });

    for (const day of [0, 1, 3, 4, 5, 6]) {
      const r = protocolPlanForDay('ESE_24', day);
      expect(r.kcalMultiplier).toBe(1);
      expect(r.share).toEqual(DEFAULT_MEAL_SHARE);
    }
  });

  it("5:2 segna lunedì e giovedì come 'fasting day' a kcal ridotte", () => {
    for (const day of [0, 3]) {
      const r = protocolPlanForDay('FIVE_TWO', day);
      expect(r.kcalMultiplier).toBeCloseTo(0.25, 5);
      // Share somma a 1 sul giorno-ridotto: la riduzione kcal è già nel multiplier.
      expect(r.share.COLAZIONE + r.share.PRANZO + r.share.SPUNTINO + r.share.CENA).toBeCloseTo(
        1,
        5,
      );
      expect(r.share.CENA).toBe(1);
      expect(r.share.COLAZIONE).toBe(0);
      expect(r.share.PRANZO).toBe(0);
      expect(r.share.SPUNTINO).toBe(0);
    }
    for (const day of [1, 2, 4, 5, 6]) {
      const r = protocolPlanForDay('FIVE_TWO', day);
      expect(r.kcalMultiplier).toBe(1);
      expect(r.share).toEqual(DEFAULT_MEAL_SHARE);
    }
  });
});
