import type { DemandWaste, WasteRange } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { count, roughDiners as diners } from './format';

export interface DemandWasteRowView {
  centreId: string;
  name: string;
  baseline: string;
  extraDiners: string;
  /** "+x.x", or "—" for a centre with no stalls recorded. */
  perStall: string;
  flagged: boolean;
  wasteKg: string;
  possiblyUndercounted: boolean;
}

export interface DemandWasteView {
  rows: DemandWasteRowView[];
  /** The total row: extra diners a day across the plan. */
  totalExtraDiners: string;
  /** "≈N", the base case in kg a day; the range goes beside it. */
  totalBase: string;
  /** "low–high" */
  totalRange: string;
}

// Waste is an assumption times modelled diners: whole kilograms, one decimal under 10.
const kg = (n: number) => (n < 10 ? n.toFixed(1) : count(Math.round(n)));

// The "Demand and food waste impact" section as Page 1 shows it (#54): every receiving centre, flagged ones first,
// and a total row.
export function demandWasteView({ rows, totalKgPerDay }: DemandWaste): DemandWasteView {
  return {
    rows: rows.map((r) => ({
      centreId: r.centreId,
      name: shortName(r.name),
      baseline: diners(r.baselineDinersPerDay),
      extraDiners: diners(r.extraDinersPerDay),
      perStall: r.extraDinersPerStall === null ? '—' : `+${r.extraDinersPerStall.toFixed(1)}`,
      flagged: r.flagged,
      wasteKg: kg(r.extraWasteKgPerDay),
      possiblyUndercounted: r.possiblyUndercounted,
    })),
    totalExtraDiners: diners(rows.reduce((sum, r) => sum + r.extraDinersPerDay, 0)),
    totalBase: `≈${kg(totalKgPerDay.base)}`,
    totalRange: range(totalKgPerDay),
  };
}

const range = ({ low, high }: WasteRange) => `${kg(low)}–${kg(high)}`;
