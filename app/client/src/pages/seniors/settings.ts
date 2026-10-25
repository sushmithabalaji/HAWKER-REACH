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
// A temporary food point if at least this many seniors in one area have no open centre in range.
export const FOOD_POINT_MIN_SENIORS = assumedNumber('access.food_point_min_seniors');
// A closure is Severe at either of these (ASSUMPTIONS.md, severity).
export const SEVERE_PRIORITY_AREAS = assumedNumber('access.severity.severe_priority_areas');
export const SEVERE_NO_WALK_SENIORS = assumedNumber('access.severity.severe_no_walk_seniors');
