// PRD §6 — eval puro degli achievement.
// Non tocca persistenza: prende metriche già misurate e ritorna le `key`
// che dovrebbero risultare sbloccate. Idempotente — l'API decide cosa
// scrivere a DB confrontando con gli already-unlocked.

import { TEN_MEALS_THRESHOLD, type AchievementKey } from './definitions.js';

export interface AchievementMetrics {
  weightEntryCount: number;
  planCount: number;
  completedFastCount: number;
  consumedMealCount: number;
}

export function evaluateAchievements(metrics: AchievementMetrics): AchievementKey[] {
  const unlocked: AchievementKey[] = [];
  if (metrics.weightEntryCount >= 1) unlocked.push('first_weigh_in');
  if (metrics.planCount >= 1) unlocked.push('first_plan');
  if (metrics.completedFastCount >= 1) unlocked.push('first_fast_complete');
  if (metrics.consumedMealCount >= TEN_MEALS_THRESHOLD) unlocked.push('ten_meals_consumed');
  return unlocked;
}
