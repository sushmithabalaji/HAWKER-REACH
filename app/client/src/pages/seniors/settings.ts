import { assumedNumber, assumptions } from '@shared/assumptions';

// Page 2's model values, read from the repo-root assumptions.json (synced into app/shared).

// Slowest first: the distance each covers in the limit is the top of T1, T2 and T3.
export const PACES = [
  assumedNumber('walk.pace.senior'),
  assumedNumber('walk.pace.typical'),
  assumedNumber('walk.pace.brisk'),
];
export const LIMIT_MIN = assumedNumber('walk.limit_min');
export const CUTOFF_M = assumedNumber('walk.cutoff_m');
export const SUPER_AGED_SHARE = assumedNumber('access.super_aged_share');
export const SUPER_AGED_PCT = Math.round(SUPER_AGED_SHARE * 100);
// "10, 20": the extra limits gold.access_sensitivity was run at.
export const SENSITIVITY_LIMITS_MIN = String(assumptions['access.sensitivity_limits_min'].value)
  .split(',')
  .map((v) => Number(v.trim()));
export const MEAL_SUPPORT_WALK_MIN = assumedNumber('access.meal_support_walk_min');
// 1,800 m: how far a senior walks in the meal-support time (ASSUMPTIONS.md, meal-support rule).
export const MEAL_SUPPORT_WALK_M = PACES[0] * MEAL_SUPPORT_WALK_MIN * 60;
