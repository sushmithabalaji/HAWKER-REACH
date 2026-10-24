import { assumptions } from '@shared/assumptions';

// Page 2's model values, read from the repo-root assumptions.json (synced into app/shared) so the
// notebooks and the page can't disagree.
function assumedNumber(key: string): number {
  const n = Number(assumptions[key].value);
  if (!Number.isFinite(n)) throw new Error(`assumptions.json ${key} is not a number`);
  return n;
}

// Slowest first: the distance each covers in the limit is the top of T1, T2 and T3.
export const PACES = [
  assumedNumber('walk.pace.senior'),
  assumedNumber('walk.pace.typical'),
  assumedNumber('walk.pace.brisk'),
];
export const LIMIT_MIN = assumedNumber('walk.limit_min');
export const CUTOFF_M = assumedNumber('walk.cutoff_m');
export const SUPER_AGED_SHARE = assumedNumber('access.super_aged_share');
// "10, 20": the extra limits gold.access_sensitivity was run at.
export const SENSITIVITY_LIMITS_MIN = String(assumptions['access.sensitivity_limits_min'].value)
  .split(',')
  .map((v) => Number(v.trim()));
