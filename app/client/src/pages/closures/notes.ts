import type { CentreDemandRow, Receiver } from '@shared/closure-engine';
import { count } from './format';

// The median of residents per stall, as 05_gold_closures computes it for the under-count flag (Spark's
// percentile, interpolating between the middle two). Centres with no value are left out.
export function medianResidentsPerStall(demand: Pick<CentreDemandRow, 'residents_per_stall'>[]): number {
  const values = demand
    .map((d) => d.residents_per_stall)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const at = (values.length - 1) / 2;
  return values[Math.floor(at)] + (values[Math.ceil(at)] - values[Math.floor(at)]) * (at - Math.floor(at));
}

// The tooltip on a "Possibly under-counted" badge (#11, story 30).
export function undercountReason(residentsPerStall: number, median: number, factor: number): string {
  return (
    `${count(Math.round(residentsPerStall))} HDB residents per stall, below ${factor} × the median of ` +
    `${count(Math.round(median))} (${count(Math.round(factor * median))}). Its diners may be mostly workers, ` +
    'visitors or private-housing residents, whom the model doesn’t count.'
  );
}

// The badge tooltip for every possibly under-counted centre, keyed by centre_id.
export function undercountNotes(
  demand: Pick<CentreDemandRow, 'centre_id' | 'residents_per_stall' | 'possibly_undercounted'>[],
  factor: number
): Map<string, string> {
  const median = medianResidentsPerStall(demand);
  return new Map(
    demand
      .filter((d) => d.possibly_undercounted)
      .map((d) => [d.centre_id, undercountReason(d.residents_per_stall, median, factor)])
  );
}

// A rise above +100% gets a note that it's a worst case (#16).
export function worstCaseNote(pct: Receiver['pctOverBaseline']): string | null {
  return pct !== 'new' && pct > 100
    ? 'A worst case: whole blocks move to their next-nearest centre together, so the real rise is likely smaller.'
    : null;
}
