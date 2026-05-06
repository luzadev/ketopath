import { describe, expect, it } from 'vitest';

import { evaluateAchievements } from './evaluator.js';

describe('evaluateAchievements', () => {
  it('returns nothing when all metrics are zero', () => {
    expect(
      evaluateAchievements({
        weightEntryCount: 0,
        planCount: 0,
        completedFastCount: 0,
        consumedMealCount: 0,
      }),
    ).toEqual([]);
  });

  it('unlocks first-time achievements at threshold 1', () => {
    expect(
      evaluateAchievements({
        weightEntryCount: 1,
        planCount: 1,
        completedFastCount: 1,
        consumedMealCount: 0,
      }),
    ).toEqual(['first_weigh_in', 'first_plan', 'first_fast_complete']);
  });

  it('unlocks ten_meals_consumed at exactly 10 consumed meals', () => {
    const at9 = evaluateAchievements({
      weightEntryCount: 0,
      planCount: 0,
      completedFastCount: 0,
      consumedMealCount: 9,
    });
    expect(at9).not.toContain('ten_meals_consumed');
    const at10 = evaluateAchievements({
      weightEntryCount: 0,
      planCount: 0,
      completedFastCount: 0,
      consumedMealCount: 10,
    });
    expect(at10).toContain('ten_meals_consumed');
  });
});
