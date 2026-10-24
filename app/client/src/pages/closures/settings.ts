import { assumptions } from '@shared/assumptions';

// Page 1's walk limits for its wording, read from the repo-root assumptions.json (synced into app/shared).
// The engine reads its own values from the same file.
function assumedNumber(key: string): number {
  const n = Number(assumptions[key].value);
  if (!Number.isFinite(n)) throw new Error(`assumptions.json ${key} is not a number`);
  return n;
}

export interface WalkLimits {
  limitMin: number;
  cutoffM: number;
}

export const WALK_LIMITS: WalkLimits = {
  limitMin: assumedNumber('walk.limit_min'),
  cutoffM: assumedNumber('walk.cutoff_m'),
};

// Lines on the ripple map go to this many receivers, and only they are labelled (#11, story 9).
export const TOP_RECEIVERS = 5;
