import { assumedNumber, type Assumptions } from '../assumptions';
import type { CentreClosureRow, GoldData } from './gold';
import { evaluatePlan, seniorsCutOffAlone } from './plan';

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
  /** End date (YYYY-MM-DD) of its latest finished Repairs and Redecoration; null when none is on record. */
  lastRR: string | null;
  /** True when no R&R is on record, or the last one ended at least `candidates.rr_cycle_years` ago. */
  dueForRR: boolean;
  /** Seniors left with no centre within the walking limit at senior pace when it closes on its own. */
  seniorsCutOff: number;
  /** Its diners today, who would all eat elsewhere while it is closed. */
  dinersDisplacedPerDay: number;
  /** Cleaning closures in the window: a note, never a reason to drop the centre. Empty without a window. */
  cleaning: CleaningPeriod[];
}

export interface CandidateResult {
  /** Due for R&R first, then fewest seniors cut off, then fewest diners displaced; up to `candidates.max_shown`. */
  candidates: Candidate[];
  /** False when no window was given, so closures were not compared. */
  overlapChecked: boolean;
  /** The plan already has `plan.max_extra_centres` extra centres, so none can be added. */
  planFull: boolean;
  /** Year of the earliest closure on record: before it, R&R history is unknown. Null with no closures. */
  recordsFrom: number | null;
}

// Works that take a centre out of service for months. Cleaning is a day or two, so it is a note only.
const WORKS = new Set(['renovation', 'redevelopment', 'partial']);
// NEA's cyclical works, as gold.centre_closures' remarks name them; an urgent repair is not one.
const RR = /repairs and redecoration|transformation programme/i;

/**
 * Open centres anywhere that could close alongside the plan (#94): a green verdict card when added, no works
 * overlapping the window, and diners we can count (not possibly under-counted). Ranked by R&R need, then by
 * what closing it does on its own: seniors cut off, then diners displaced.
 */
export function findCandidates(
  data: GoldData,
  anchorId: string,
  selectedIds: string[],
  window: ClosureWindow | null,
  today: string,
  assumptions: Assumptions
): CandidateResult {
  if (window && window.from > window.to) throw new Error('The closure window ends before it starts.');
  evaluatePlan(data, anchorId, selectedIds, assumptions); // rejects a plan the page could not show
  const overlapChecked = window !== null;
  const starts = data.centreClosures.map((k) => k.start_date).sort();
  const recordsFrom = starts.length > 0 ? Number(starts[0].slice(0, 4)) : null;
  if (selectedIds.length >= assumedNumber('plan.max_extra_centres', assumptions)) {
    return { candidates: [], overlapChecked, planFull: true, recordsFrom };
  }

  const cycleYears = assumedNumber('candidates.rr_cycle_years', assumptions);
  const dueBy = `${Number(today.slice(0, 4)) - cycleYears}${today.slice(4)}`;
  const demand = new Map(data.centreDemand.map((d) => [d.centre_id, d]));
  const seniorsCutOff = seniorsCutOffAlone(data, assumptions);
  const inPlan = new Set([anchorId, ...selectedIds]);
  // A centre's closures that overlap the window; none when there is no window to compare against.
  const closuresInWindow = (centreId: string) =>
    window
      ? data.centreClosures.filter(
          (k) => k.centre_id === centreId && k.start_date <= window.to && window.from <= k.end_date
        )
      : [];

  const found: Candidate[] = [];
  for (const centre of data.centres) {
    // A possibly under-counted centre's diners are a floor (mostly office or tourist trade), so "few diners
    // displaced" can't be trusted for it.
    const own = demand.get(centre.centre_id);
    if (centre.is_interim || inPlan.has(centre.centre_id) || !own || own.possibly_undercounted) continue;
    const overlaps = closuresInWindow(centre.centre_id);
    if (overlaps.some((k) => WORKS.has(k.type))) continue;

    const { cards } = evaluatePlan(data, anchorId, [...selectedIds, centre.centre_id], assumptions);
    const card = cards[cards.length - 1]; // cards follow `selectedIds`, so the last one is the added centre
    if (card.status !== 'green') continue;
    const lastRR = latestRR(data.centreClosures, centre.centre_id, today);
    found.push({
      centreId: centre.centre_id,
      name: centre.name,
      lastRR,
      dueForRR: lastRR === null || lastRR <= dueBy,
      seniorsCutOff: seniorsCutOff(centre.centre_id),
      dinersDisplacedPerDay: own.baseline_diners_per_day,
      cleaning: overlaps
        .filter((k) => k.type === 'cleaning')
        .map((k) => ({ startDate: k.start_date, endDate: k.end_date })),
    });
  }

  const shown = assumedNumber('candidates.max_shown', assumptions);
  return { candidates: found.sort(dueThenLeastHarm).slice(0, shown), overlapChecked, planFull: false, recordsFrom };
}

function latestRR(closures: CentreClosureRow[], centreId: string, today: string): string | null {
  const ends = closures
    .filter(
      (k) => k.centre_id === centreId && k.type === 'renovation' && RR.test(k.remarks ?? '') && k.end_date < today
    )
    .map((k) => k.end_date)
    .sort();
  return ends.length > 0 ? ends[ends.length - 1] : null;
}

function dueThenLeastHarm(a: Candidate, b: Candidate): number {
  return (
    Number(b.dueForRR) - Number(a.dueForRR) ||
    a.seniorsCutOff - b.seniorsCutOff ||
    a.dinersDisplacedPerDay - b.dinersDisplacedPerDay ||
    (a.centreId < b.centreId ? -1 : a.centreId > b.centreId ? 1 : 0)
  );
}
