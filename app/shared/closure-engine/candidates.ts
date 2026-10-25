import { assumedNumber, type Assumptions } from '../assumptions';
import type { GoldData } from './gold';
import { evaluatePlan } from './plan';

/** The dates (YYYY-MM-DD, inclusive) the anchor closes between. */
export interface ClosureWindow {
  from: string;
  to: string;
}

export interface CleaningPeriod {
  startDate: string;
  endDate: string;
}

export interface Candidate {
  centreId: string;
  name: string;
  /** Straight line from the anchor, in metres. */
  distanceM: number;
  openingYear: number | null;
  /** Years since it opened, a proxy for maintenance need; null when the opening year is unknown. */
  ageYears: number | null;
  /** The candidate's own verdict card in the plan with it added. */
  status: 'green' | 'yellow';
  reason: string;
  /** Cleaning closures in the window: a note, never a reason to drop the centre. Empty without a window. */
  cleaning: CleaningPeriod[];
}

export interface CandidateResult {
  /** Greens oldest first, then nearest; yellows fill any gap up to `candidates.max_shown`. Never red. */
  candidates: Candidate[];
  /** False when no window was given, so closures were not compared. */
  overlapChecked: boolean;
  /** The plan already has `plan.max_extra_centres` extra centres, so none can be added. */
  planFull: boolean;
}

// Works that take a centre out of service for months. Cleaning is a day or two, so it is a note only.
const WORKS = new Set(['renovation', 'redevelopment', 'partial']);

/**
 * Open centres within the walking cutoff of the anchor that could close alongside the plan: no works
 * overlapping the window, and a green (or, to fill gaps, yellow) verdict card when added to the plan.
 */
export function findCandidates(
  data: GoldData,
  anchorId: string,
  selectedIds: string[],
  window: ClosureWindow | null,
  currentYear: number,
  assumptions: Assumptions
): CandidateResult {
  if (window && window.from > window.to) throw new Error('The closure window ends before it starts.');
  evaluatePlan(data, anchorId, selectedIds, assumptions); // rejects a plan the page could not show
  const overlapChecked = window !== null;
  if (selectedIds.length >= assumedNumber('plan.max_extra_centres', assumptions)) {
    return { candidates: [], overlapChecked, planFull: true };
  }

  const anchor = data.centres.find((c) => c.centre_id === anchorId)!;
  const cutoffM = assumedNumber('walk.cutoff_m', assumptions);
  const inPlan = new Set([anchorId, ...selectedIds]);
  const overlapping = (centreId: string, type: (t: string) => boolean) =>
    window
      ? data.centreClosures.filter(
          (k) => k.centre_id === centreId && type(k.type) && k.start_date <= window.to && window.from <= k.end_date
        )
      : [];

  const found: Candidate[] = [];
  for (const centre of data.centres) {
    if (centre.is_interim || inPlan.has(centre.centre_id)) continue;
    const distanceM = metresBetween(anchor, centre);
    if (distanceM > cutoffM || overlapping(centre.centre_id, (t) => WORKS.has(t)).length > 0) continue;

    const { cards } = evaluatePlan(data, anchorId, [...selectedIds, centre.centre_id], assumptions);
    const card = cards[cards.length - 1];
    if (card.status === 'red') continue;
    found.push({
      centreId: centre.centre_id,
      name: centre.name,
      distanceM,
      openingYear: centre.opening_year,
      ageYears: centre.opening_year === null ? null : Math.max(0, currentYear - centre.opening_year),
      status: card.status,
      reason: card.reason,
      cleaning: overlapping(centre.centre_id, (t) => t === 'cleaning').map((k) => ({
        startDate: k.start_date,
        endDate: k.end_date,
      })),
    });
  }

  const greens = found.filter((c) => c.status === 'green').sort(oldestThenNearest);
  const yellows = found.filter((c) => c.status === 'yellow').sort(nearest);
  const shown = assumedNumber('candidates.max_shown', assumptions);
  return { candidates: [...greens, ...yellows].slice(0, shown), overlapChecked, planFull: false };
}

function nearest(a: Candidate, b: Candidate): number {
  return a.distanceM - b.distanceM || (a.centreId < b.centreId ? -1 : a.centreId > b.centreId ? 1 : 0);
}

// An unknown opening year sorts last: there is no age to rank it by.
function oldestThenNearest(a: Candidate, b: Candidate): number {
  return (a.openingYear ?? Infinity) - (b.openingYear ?? Infinity) || nearest(a, b);
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two centres, in metres. */
function metresBetween(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
