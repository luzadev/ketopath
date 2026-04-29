import { ACTIVITY_MULTIPLIERS, type ActivityLevel } from './types.js';

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  if (bmr <= 0) {
    throw new RangeError('bmr must be positive');
  }
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}
