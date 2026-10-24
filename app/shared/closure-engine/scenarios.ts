import type { Assumptions } from '../assumptions';
import type { GoldData } from './gold';
import { evaluatePlan } from './plan';

/** `gold.closure_scenarios` (Spec 2, 05_gold_closures): one row per closable centre, closing alone. */
export interface ClosureScenarioRow {
  centre_id: string;
  /** Null when the closure displaces no one. */
  worst_neighbour_id: string | null;
  worst_neighbour_extra_per_stall: number | null;
  /** Null when the worst neighbour has no baseline diners. */
  worst_neighbour_pct: number | null;
  unserved_residents: number;
  seniors_lost_walk: number;
}

export type ScenarioField = Exclude<keyof ClosureScenarioRow, 'centre_id'>;

export interface ScenarioMismatch {
  centreId: string;
  field: ScenarioField;
  engine: string | number | null;
  gold: string | number | null;
}

const TOLERANCE = 0.01;

function agrees(engine: string | number | null, gold: string | number | null): boolean {
  if (typeof engine === 'number' && typeof gold === 'number') return Math.abs(engine - gold) <= TOLERANCE;
  return engine === gold;
}

// #18: every single closure in gold.closure_scenarios must match the engine, so Page 1 and Spec 2's
// model agree. Returns each field that doesn't, by centre.
export function checkScenarios(
  data: GoldData,
  scenarios: ClosureScenarioRow[],
  assumptions: Assumptions
): ScenarioMismatch[] {
  return scenarios.flatMap((gold) => {
    const result = evaluatePlan(data, gold.centre_id, [], assumptions);
    const worst = result.tiles.biggestLoad.centre;
    const engine: Record<ScenarioField, string | number | null> = {
      worst_neighbour_id: worst?.centreId ?? null,
      worst_neighbour_extra_per_stall: worst?.extraDinersPerStall ?? null,
      worst_neighbour_pct: worst && worst.pctOverBaseline !== 'new' ? worst.pctOverBaseline : null,
      unserved_residents: result.unserved.residents,
      seniors_lost_walk: result.accessLoss.senior.seniors,
    };
    return (Object.keys(engine) as ScenarioField[])
      .filter((field) => !agrees(engine[field], gold[field]))
      .map((field) => ({ centreId: gold.centre_id, field, engine: engine[field], gold: gold[field] }));
  });
}
