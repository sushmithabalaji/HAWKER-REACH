import type { DemandWaste, WasteRange } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { count, pctOverBaseline, roundTo10 } from './format';

export interface DemandWasteRowView {
  centreId: string;
  name: string;
  baseline: string;
  extraDiners: string;
  /** "+x.x", or "—" for a centre with no stalls recorded. */
  perStall: string;
  pctOverBaseline: string;
  flagged: boolean;
  wasteKg: string;
  possiblyUndercounted: boolean;
}

export interface DemandWasteView {
  rows: DemandWasteRowView[];
  /** "≈N kg a day", the base case; the range goes beside it. */
  totalBase: string;
  totalRange: string;
  flaggedCount: number;
}

// Diners are modelled, so they are shown to the nearest 10; under 5 would read as 0, so it is "<10".
const diners = (n: number) => (n <= 0 ? '0' : roundTo10(n) === 0 ? '<10' : count(roundTo10(n)));
// Waste is an assumption times modelled diners: whole kilograms, one decimal under 10.
const kg = (n: number) => (n < 10 ? n.toFixed(1) : count(Math.round(n)));

// The "Demand & waste" tab as Page 1 shows it (#54): every receiving centre, flagged ones first.
export function demandWasteView({ rows, totalKgPerDay }: DemandWaste): DemandWasteView {
  return {
    rows: rows.map((r) => ({
      centreId: r.centreId,
      name: shortName(r.name),
      baseline: diners(r.baselineDinersPerDay),
      extraDiners: diners(r.extraDinersPerDay),
      perStall: r.extraDinersPerStall === null ? '—' : `+${r.extraDinersPerStall.toFixed(1)}`,
      pctOverBaseline: pctOverBaseline(r.pctOverBaseline),
      flagged: r.flagged,
      wasteKg: kg(r.extraWasteKgPerDay),
      possiblyUndercounted: r.possiblyUndercounted,
    })),
    totalBase: `≈${kg(totalKgPerDay.base)} kg a day`,
    totalRange: range(totalKgPerDay),
    flaggedCount: rows.filter((r) => r.flagged).length,
  };
}

const range = ({ low, high }: WasteRange) => `${kg(low)}–${kg(high)} kg a day`;
