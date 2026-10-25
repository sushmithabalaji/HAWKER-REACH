import { assumedNumber, type Assumptions } from '../assumptions';
import type { Receiver } from './plan';

export interface DemandWasteRow {
  centreId: string;
  name: string;
  baselineDinersPerDay: number;
  extraDinersPerDay: number;
  /** Extra diners per day ÷ `cooked_food_stalls`; null for a centre with no stalls, as in gold. */
  extraDinersPerStall: number | null;
  /** Extra diners as % of the centre's own baseline; information only. "new" when the baseline is 0. */
  pctOverBaseline: number | 'new';
  /** Same rule as the NEA actions line on the verdict cards. */
  flagged: boolean;
  /** Extra diners × the base-case kg per diner per day (ASSUMPTION). */
  extraWasteKgPerDay: number;
  possiblyUndercounted: boolean;
}

export interface WasteRange {
  low: number;
  base: number;
  high: number;
}

export interface DemandWaste {
  /** Every open centre taking displaced diners: flagged first, then most extra diners per stall. */
  rows: DemandWasteRow[];
  /** The flag line: extra diners per stall above this. Same value as `neaActions.threshold`. */
  threshold: number;
  /** Extra waste across the plan. Low and high combine the visits-per-week and kg-per-diner ranges. */
  totalKgPerDay: WasteRange;
}

/** Spec 4's demand-and-waste view of a plan, from the receivers `evaluatePlan` has already worked out. */
export function demandWasteOf(
  receivers: Receiver[],
  baselines: Map<string, number>,
  flagged: Set<string>,
  threshold: number,
  assumptions: Assumptions
): DemandWaste {
  const kg = (level: keyof WasteRange) => assumedNumber(`waste.kg_per_diner_per_day.${level}`, assumptions);
  const visits = assumedNumber('diners.visits_per_week.base', assumptions);
  const visitsScale = (end: 'min' | 'max') => assumedNumber(`diners.visits_per_week.${end}`, assumptions) / visits;

  const rows = receivers
    .map(
      (r): DemandWasteRow => ({
        centreId: r.centreId,
        name: r.name,
        baselineDinersPerDay: baselines.get(r.centreId) ?? 0,
        extraDinersPerDay: r.extraDinersPerDay,
        extraDinersPerStall: r.extraDinersPerStall,
        pctOverBaseline: r.pctOverBaseline,
        flagged: flagged.has(r.centreId),
        extraWasteKgPerDay: r.extraDinersPerDay * kg('base'),
        possiblyUndercounted: r.possiblyUndercounted,
      })
    )
    .sort(
      (a, b) =>
        Number(b.flagged) - Number(a.flagged) ||
        (b.extraDinersPerStall ?? -Infinity) - (a.extraDinersPerStall ?? -Infinity) ||
        (a.centreId < b.centreId ? -1 : a.centreId > b.centreId ? 1 : 0)
    );

  const diners = receivers.reduce((sum, r) => sum + r.extraDinersPerDay, 0);
  return {
    rows,
    threshold,
    totalKgPerDay: {
      low: diners * visitsScale('min') * kg('low'),
      base: diners * kg('base'),
      high: diners * visitsScale('max') * kg('high'),
    },
  };
}
