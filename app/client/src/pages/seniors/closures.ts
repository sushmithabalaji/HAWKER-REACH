import { shortName } from '@/components/shared/centres';
import { toNumber, toText, type RawRow } from '@/components/shared/queryValues';
import type { Closure } from './scenario';

// A current or upcoming closure from gold.centre_closures (config/queries/seniors_closures.sql).
export interface NeaClosure {
  closure_id: string;
  centre_id: string;
  name: string;
  pln_area_n: string;
  type: string;
  start_date: string; // YYYY-MM-DD, so dates compare as strings
  end_date: string;
  duration_days: number;
  remarks: string;
}

export function toNeaClosure(row: RawRow): NeaClosure {
  return {
    closure_id: toText(row.closure_id),
    centre_id: toText(row.centre_id),
    name: toText(row.name),
    pln_area_n: toText(row.pln_area_n),
    type: toText(row.type),
    start_date: toText(row.start_date),
    end_date: toText(row.end_date),
    duration_days: toNumber(row.duration_days),
    remarks: toText(row.remarks ?? ''),
  };
}

// Cleaning lasts a few days, so it is only ever a note (ASSUMPTIONS.md, what can be picked).
const PICKABLE = ['renovation', 'redevelopment'];
export const isPickable = (c: NeaClosure) => PICKABLE.includes(c.type);

export function pickableIn(closures: readonly NeaClosure[], town: string | null): NeaClosure[] {
  return closures.filter((c) => isPickable(c) && (town === null || c.pln_area_n === town));
}

const overlaps = (a: NeaClosure, b: NeaClosure) => a.start_date <= b.end_date && b.start_date <= a.end_date;

// Other closures at other centres during the picked one's dates.
function alongside(picked: NeaClosure, closures: readonly NeaClosure[]): NeaClosure[] {
  return closures.filter((c) => c.centre_id !== picked.centre_id && overlaps(picked, c));
}

// Renovation and redevelopment at the same time count as closed; cleaning doesn't.
export function overlappingClosures(picked: NeaClosure, closures: readonly NeaClosure[]): NeaClosure[] {
  return alongside(picked, closures).filter(isPickable);
}

export function closureFor(picked: NeaClosure, closures: readonly NeaClosure[]): Closure {
  const alsoClosed = new Set(overlappingClosures(picked, closures).map((c) => c.centre_id));
  return { centreId: picked.centre_id, alsoClosed: [...alsoClosed] };
}

// Works closures during the picked dates at centres the affected blocks would move to (their second and
// third nearest), which they skip. Works elsewhere change nothing, and cleaning counts as open.
export function nearbyWorks(
  picked: NeaClosure,
  closures: readonly NeaClosure[],
  neighbourIds: ReadonlySet<string>
): NeaClosure[] {
  return alongside(picked, closures).filter((c) => neighbourIds.has(c.centre_id) && isPickable(c));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, text: `${d} ${MONTHS[m - 1]}` };
};

// "14 Sep – 13 Dec 2026", or across years "1 Dec 2026 – 31 Jan 2027".
export function dateRange(c: NeaClosure): string {
  const a = day(c.start_date);
  const b = day(c.end_date);
  return a.y === b.y ? `${a.text} – ${b.text} ${b.y}` : `${a.text} ${a.y} – ${b.text} ${b.y}`;
}

// "Kim Keat Palm (14 Sep – 13 Dec 2026)"
export function closureLabel(c: NeaClosure): string {
  return `${shortName(c.name)} (${dateRange(c)})`;
}
