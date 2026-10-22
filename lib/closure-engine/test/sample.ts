// Builders for small hand-made gold samples. Options are listed nearest first,
// in gold's order (walk_m, then centre_id), and get ranks 1, 2, 3...
import type {
  BlockOptionRow,
  CentreClosureRow,
  CentreDemandRow,
  CentreRow,
  GoldData,
} from "../src/gold";
import rawAssumptions from "../../../assumptions.json";
import type { Assumptions } from "../src/gold";

export const assumptions = rawAssumptions as Assumptions;

/** A copy of assumptions.json with some values changed. */
export function withValues(values: Record<string, number>): Assumptions {
  const copy = structuredClone(assumptions);
  for (const [key, value] of Object.entries(values)) copy[key]!.value = value;
  return copy;
}

export interface CentreSpec {
  stalls?: number;
  interim?: boolean;
  baseline?: number;
  undercounted?: boolean;
  name?: string;
}

export function centre(id: string, spec: CentreSpec = {}) {
  return { id, ...spec };
}

export interface BlockSpec {
  diners?: number;
  residents?: number;
  seniors?: number;
}

export function block(
  id: string,
  options: [centreId: string, walkM: number][],
  spec: BlockSpec = {},
) {
  return { id, options, ...spec };
}

export function town(
  centres: ReturnType<typeof centre>[],
  blocks: ReturnType<typeof block>[],
  centreClosures: CentreClosureRow[] = [],
): GoldData {
  const centreRows: CentreRow[] = centres.map((c, i) => ({
    centre_id: c.id,
    name: c.name ?? `Centre ${c.id}`,
    lon: 103.8 + i * 0.01,
    lat: 1.35,
    cooked_food_stalls: c.stalls ?? 10,
    is_interim: c.interim ?? false,
    pln_area_n: "TOA PAYOH",
    subzone_id: "TPSZ01",
  }));
  const centreDemand: CentreDemandRow[] = centres.map((c) => ({
    centre_id: c.id,
    baseline_diners_per_day: c.baseline ?? 1000,
    residents_per_stall: 300,
    possibly_undercounted: c.undercounted ?? false,
  }));
  const blockOptions: BlockOptionRow[] = blocks.flatMap((b, i): BlockOptionRow[] => {
    const shared = {
      block_id: b.id,
      lon: 103.8 + i * 0.001,
      lat: 1.34,
      subzone: "TPSZ01",
      est_residents: b.residents ?? 100,
      est_seniors: b.seniors ?? 20,
      diners_per_day: b.diners ?? 36,
    };
    if (b.options.length === 0) {
      return [{ ...shared, centre_id: null, walk_m: null, rank: 1 }];
    }
    return b.options.map(([centreId, walkM], r) => ({
      ...shared,
      centre_id: centreId,
      walk_m: walkM,
      rank: r + 1,
    }));
  });
  return { blockOptions, centres: centreRows, centreDemand, centreClosures };
}
