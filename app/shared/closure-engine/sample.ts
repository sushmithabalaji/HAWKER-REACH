// Builders for small hand-made gold samples. Options are listed nearest first,
// in gold's order (walk_m, then centre_id), and get ranks 1, 2, 3...
import { assumptions, type Assumptions } from '../assumptions';
import type { BlockOptionRow, CentreClosureRow, CentreDemandRow, CentreRow, GoldData } from './gold';

export { assumptions };

// As in 05_gold_closures: diners per day = residents × eating share × visits per week ÷ 7.
const num = (key: string) => assumptions[key].value as number;
const dinersPerResident = (num('diners.eating_share') * num('diners.visits_per_week.base')) / 7;

/** A copy of assumptions.json with some values changed. */
export function withValues(values: Record<string, number>): Assumptions {
  const copy = structuredClone(assumptions);
  for (const [key, value] of Object.entries(values)) copy[key].value = value;
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

export function block(id: string, options: [centreId: string, walkM: number][], spec: BlockSpec = {}) {
  return { id, options, ...spec };
}

export function town(
  centres: ReturnType<typeof centre>[],
  blocks: ReturnType<typeof block>[],
  centreClosures: CentreClosureRow[] = []
): GoldData {
  const centreRows: CentreRow[] = centres.map((c, i) => ({
    centre_id: c.id,
    name: c.name ?? `Centre ${c.id}`,
    lon: 103.8 + i * 0.01,
    lat: 1.35,
    cooked_food_stalls: c.stalls ?? 10,
    is_interim: c.interim ?? false,
    pln_area_n: 'TOA PAYOH',
    subzone_id: 'TPSZ01',
    opening_year: 1980,
  }));
  const centreDemand: CentreDemandRow[] = centres.map((c) => ({
    centre_id: c.id,
    baseline_residents: (c.baseline ?? 1000) / dinersPerResident,
    baseline_diners_per_day: c.baseline ?? 1000,
    residents_per_stall: 300,
    possibly_undercounted: c.undercounted ?? false,
  }));
  const blockOptions: BlockOptionRow[] = blocks.flatMap((b, i): BlockOptionRow[] => {
    const shared = {
      block_id: b.id,
      lon: 103.8 + i * 0.001,
      lat: 1.34,
      subzone_id: 'TPSZ01',
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

// A closes beside B, C and D; D is where A's, B's and C's diners go. Dover (D) has 400 diners a day today and every
// other centre 1,000, so extra diners as a % of today are:
//   A alone sends D 20 (5%), B alone 40 (10%), C alone 40 (10%); A + B: D 60 (15%); A + B + C: D 100 (25%).
//   Five padding pairs P → Q send Q 50 to 80 (5% to 8%) when P closes. Nobody's fallback is a P or a Q, and D is
//   only a fallback, so closing D or a Q moves nobody.
export const PADDING = [5, 6, 7, 8, 8];

export function verdictTown(extraBlocks: ReturnType<typeof block>[] = []) {
  return town(
    [
      centre('HC_A', { name: 'Anchor Market' }),
      centre('HC_B', { name: 'Bedok Corner' }),
      centre('HC_C', { name: 'Clementi Court' }),
      centre('HC_D', { name: 'Dover Food Centre', baseline: 400 }),
      ...PADDING.flatMap((_, i) => [centre(`HC_P${i}`), centre(`HC_Q${i}`)]),
    ],
    [
      block(
        'bA',
        [
          ['HC_A', 300],
          ['HC_D', 800],
        ],
        { diners: 20 }
      ),
      block(
        'bB',
        [
          ['HC_B', 300],
          ['HC_D', 700],
        ],
        { diners: 40 }
      ),
      block(
        'bC',
        [
          ['HC_C', 300],
          ['HC_D', 700],
        ],
        { diners: 40 }
      ),
      block('bD', [['HC_D', 200]], { diners: 10 }),
      ...PADDING.map((perStall, i) =>
        block(
          `bP${i}`,
          [
            [`HC_P${i}`, 300],
            [`HC_Q${i}`, 600],
          ],
          { diners: perStall * 10 }
        )
      ),
      ...extraBlocks,
    ]
  );
}
