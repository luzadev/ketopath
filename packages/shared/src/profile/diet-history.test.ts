import { describe, expect, it } from 'vitest';

import { bmrAdjustForDietHistory } from './diet-history.js';

describe('bmrAdjustForDietHistory', () => {
  it('NONE → 1.0', () => {
    expect(bmrAdjustForDietHistory('NONE')).toBe(1);
  });
  it('SOME → 0.97', () => {
    expect(bmrAdjustForDietHistory('SOME')).toBe(0.97);
  });
  it('EXTENSIVE → 0.93', () => {
    expect(bmrAdjustForDietHistory('EXTENSIVE')).toBe(0.93);
  });
  it('SEVERE → 0.85', () => {
    expect(bmrAdjustForDietHistory('SEVERE')).toBe(0.85);
  });
  it('null/undefined → 1.0', () => {
    expect(bmrAdjustForDietHistory(null)).toBe(1);
    expect(bmrAdjustForDietHistory(undefined)).toBe(1);
  });
});
