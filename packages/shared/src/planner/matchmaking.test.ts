import { describe, expect, it } from 'vitest';

import { DEFAULT_MEAL_SHARE, matchMeals, type RecipeCandidate } from './matchmaking.js';

const recipes: RecipeCandidate[] = [
  {
    id: 'r1',
    name: 'Frittata di spinaci',
    category: 'COLAZIONE',
    kcal: 350,
    proteinG: 25,
    fatG: 25,
    netCarbG: 4,
    exclusionTags: ['eggs', 'lactose'],
    phases: [1, 2, 3],
  },
  {
    id: 'r2',
    name: 'Avocado toast keto',
    category: 'COLAZIONE',
    kcal: 380,
    proteinG: 12,
    fatG: 30,
    netCarbG: 6,
    exclusionTags: [],
    phases: [1, 2, 3],
  },
  {
    id: 'r3',
    name: 'Pasta integrale al pomodoro',
    category: 'COLAZIONE',
    kcal: 420,
    proteinG: 14,
    fatG: 8,
    netCarbG: 60,
    exclusionTags: ['gluten'],
    phases: [3], // ammessa solo in mantenimento
  },
];

describe('matchMeals', () => {
  it('filters by excluded tags', () => {
    const out = matchMeals({
      candidates: recipes,
      meal: 'COLAZIONE',
      phase: 1,
      excludedTags: ['eggs'],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
    });
    expect(out.find((r) => r.id === 'r1')).toBeUndefined();
    expect(out.find((r) => r.id === 'r2')).toBeDefined();
  });

  it('filters by phase compatibility', () => {
    const out = matchMeals({
      candidates: recipes,
      meal: 'COLAZIONE',
      phase: 1,
      excludedTags: [],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
    });
    expect(out.find((r) => r.id === 'r3')).toBeUndefined(); // r3 è solo fase 3
  });

  it('penalises recently consumed recipes', () => {
    const without = matchMeals({
      candidates: recipes,
      meal: 'COLAZIONE',
      phase: 1,
      excludedTags: [],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
    });
    const winner = without[0]!.id;
    const withRecent = matchMeals({
      candidates: recipes,
      meal: 'COLAZIONE',
      phase: 1,
      excludedTags: [],
      recentlyConsumedIds: [winner],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
    });
    expect(withRecent[0]!.id).not.toBe(winner);
  });

  it('respects topN', () => {
    const out = matchMeals({
      candidates: recipes,
      meal: 'COLAZIONE',
      phase: 1,
      excludedTags: [],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
      topN: 1,
    });
    expect(out).toHaveLength(1);
  });

  it('ignores recipes whose category does not match the meal', () => {
    const out = matchMeals({
      candidates: recipes,
      meal: 'CENA',
      phase: 1,
      excludedTags: [],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
    });
    expect(out).toHaveLength(0);
  });

  it('filters by banned ingredient ids', () => {
    const withIds: RecipeCandidate[] = recipes.map((r) => ({
      ...r,
      ingredientIds: r.id === 'r1' ? ['ing-egg', 'ing-spinach'] : ['ing-avocado'],
    }));
    const out = matchMeals({
      candidates: withIds,
      meal: 'COLAZIONE',
      phase: 1,
      excludedTags: [],
      bannedIngredientIds: ['ing-egg'],
      dailyTarget: { kcal: 1900, proteinG: 130, fatG: 130, netCarbG: 25 },
      mealShare: DEFAULT_MEAL_SHARE,
    });
    expect(out.find((r) => r.id === 'r1')).toBeUndefined();
    expect(out.find((r) => r.id === 'r2')).toBeDefined();
  });
});
