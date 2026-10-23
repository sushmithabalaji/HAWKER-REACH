import type { Assumptions } from '../assumptions';
import type { BlockOptionRow, CentreClosureRow, CentreDemandRow, CentreRow, GoldData } from './gold';

export interface Receiver {
  centreId: string;
  name: string;
  extraDinersPerDay: number;
  /** Extra diners per day ÷ `cooked_food_stalls`; null for a centre with no stalls, as in gold. */
  extraDinersPerStall: number | null;
  /** Extra diners as % of the centre's baseline; information only. "new" when the baseline is 0. */
  pctOverBaseline: number | 'new';
  /** Share (0–1) of the plan's displaced diners this centre takes. */
  shareOfDisplaced: number;
  possiblyUndercounted: boolean;
}

export type Pace = 'senior' | 'typical' | 'brisk';

export interface AccessLoss {
  /** Blocks with a centre within the walking limit at this pace before the plan, and none after. */
  blocks: number;
  seniors: number;
  blockIds: string[];
}

export interface PlanResult {
  /** Diners per day whose nearest centre closes and who move to another centre. */
  displacedDinersPerDay: number;
  /** Open centres taking displaced diners, most extra diners first. */
  receivers: Receiver[];
  /** Blocks left with no open centre within the cutoff because of the plan. */
  unserved: { blocks: number; residents: number; dinersPerDay: number };
  accessLoss: Record<Pace, AccessLoss>;
  tiles: Tiles;
  takeaway: TakeawayParts;
  /** The load benchmark the verdicts use; shown in the Assumptions panel. */
  benchmark: Benchmark;
  /** One per selected centre, in the order given: the plan compared with the plan where it stays open. */
  cards: VerdictCard[];
  /** The whole-plan line above the cards. */
  plan: PlanLine;
  /** Centres needing extra bins, collection and cleaning checks; never changes a colour. */
  neaActions: {
    /** `actions.waste.extra_per_stall_share` × a typical (median) centre's baseline diners per stall. */
    threshold: number;
    centres: NeaAction[];
  };
}

export type Status = 'red' | 'yellow' | 'green';

export interface PlanLine {
  /** The worst card's colour; null when only the anchor is chosen. */
  status: Status | null;
  /** Cards by colour. */
  counts: Record<Status, number>;
  /** Every rule the anchor breaks on its own, as reasons; listed, never colouring the plan. */
  anchorProblems: string[];
}

export interface PastBenchmark {
  centreId: string;
  name: string;
  /** Extra diners per stall with the plan, and with this centre left open. */
  extraDinersPerStall: number;
  withoutThisCentre: number;
}

export interface VerdictCard {
  centreId: string;
  name: string;
  status: Status;
  /** The first rule that fired, or null when green. */
  rule: 'access' | 'load' | null;
  /** Plain words with the numbers. */
  reason: string;
  /** Blocks (and their seniors) that lose a centre within the limit at senior pace only because this centre closes too. */
  cutOff: { blocks: number; seniors: number };
  /** Centres pushed past the benchmark that set the colour. */
  pastBenchmark: PastBenchmark[];
  /** Share (0–1) of the plan's displaced diners whose nearest centre this is; information only. */
  shareOfDisplaced: number;
  /** Every centre whose extra diners per stall rises because this centre closes too, most first. */
  pushes: PastBenchmark[];
  /** Blocks losing a centre within the limit at each pace only because this centre closes too. */
  accessLoss: Record<Pace, number>;
  /** Centres it pushes that are above the NEA actions threshold with the plan. */
  neaActions: NeaAction[];
  possiblyUndercounted: boolean;
  /** Its renovation or redevelopment closures that overlap one at another centre in the plan (MEASURED). */
  overlaps: ClosureOverlap[];
}

export interface ClosureOverlap {
  withCentreId: string;
  withName: string;
  own: ClosurePeriod;
  other: ClosurePeriod;
}

export interface ClosurePeriod {
  type: 'renovation' | 'redevelopment';
  startDate: string;
  endDate: string;
}

export interface NeaAction {
  centreId: string;
  name: string;
  extraDinersPerStall: number;
}

export interface Benchmark {
  /** Median worst-neighbour extra diners per stall over every single closure. */
  typical: number;
  /** The "3 in 4" quantile of the same. */
  threeInFour: number;
  typicalQuantile: number;
  threeInFourQuantile: number;
}

/** The facts the one-sentence takeaway is written from. */
export interface TakeawayParts {
  /** Anchor first, then selected centres in the order given. */
  closedCentreNames: string[];
  /** To the nearest 10. */
  displacedDinersPerDay: number;
  receiverCount: number;
  /** Null when the plan displaces no modelled diners. */
  topReceiver: { name: string; shareOfDisplaced: number } | null;
  unservedResidents: number;
  seniorBlocksLosingAccess: number;
  /** The verdict summary the sentence ends with. */
  verdict: Pick<PlanLine, 'status' | 'counts'>;
}

interface Tile {
  tag: 'MODELLED';
  /** Gold tables the number comes from. */
  source: string;
}

export interface Tiles {
  displaced: Tile & {
    /** To the nearest 10 (shown with ≈). */
    dinersPerDay: number;
    unservedDinersPerDay: number;
  };
  biggestLoad: Tile & {
    /** The receiver with the most extra diners per stall; null when nobody moves. */
    centre: Pick<Receiver, 'centreId' | 'name' | 'extraDinersPerStall' | 'pctOverBaseline'> | null;
  };
  accessLoss: Tile & Record<Pace, number> & { limitMin: number };
  verdict: Tile & Pick<PlanLine, 'status' | 'counts'>;
}

const PACES: Pace[] = ['senior', 'typical', 'brisk'];

export type PlanErrorCode = 'interim-centre' | 'too-many-centres' | 'unknown-centre' | 'duplicate-centre';

/** A plan the page must not evaluate; `message` is safe to show the planner. */
export class PlanError extends Error {
  constructor(
    readonly code: PlanErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'PlanError';
  }
}

interface Block {
  id: string;
  residents: number;
  seniors: number;
  dinersPerDay: number;
  /** Centres within the cutoff, nearest first. */
  options: { centreId: string; walkM: number }[];
}

export function evaluatePlan(
  data: GoldData,
  anchorId: string,
  selectedIds: string[],
  assumptions: Assumptions
): PlanResult {
  const prepared = prepare(data, assumptions);
  const { centres, demand } = prepared;
  const maxSelected = value(assumptions, 'plan.max_extra_centres');
  if (selectedIds.length > maxSelected) {
    throw new PlanError('too-many-centres', `Up to ${maxSelected} at once. Remove one to add another.`);
  }
  const planIds = [anchorId, ...selectedIds];
  for (const id of planIds) {
    const centre = centres.get(id);
    if (!centre) throw new PlanError('unknown-centre', `No centre with id ${id}.`);
    if (centre.is_interim) {
      throw new PlanError('interim-centre', `${centre.name} is an interim centre and can't be closed in a plan.`);
    }
  }

  const closed = new Set(planIds);
  if (closed.size < planIds.length) {
    throw new PlanError('duplicate-centre', 'Each centre can be in the plan only once.');
  }

  const planOutcome = regroup(prepared, closed);
  const { extra, displaced, unserved, accessLoss } = planOutcome;

  const receivers = [...extra]
    .map(([centreId, extraDinersPerDay]): Receiver => {
      const baseline = demand.get(centreId)?.baseline_diners_per_day ?? 0;
      return {
        centreId,
        name: centres.get(centreId)!.name,
        extraDinersPerDay,
        extraDinersPerStall: perStall(prepared, centreId, extraDinersPerDay),
        pctOverBaseline: baseline > 0 ? (extraDinersPerDay / baseline) * 100 : 'new',
        shareOfDisplaced: extraDinersPerDay / displaced,
        possiblyUndercounted: demand.get(centreId)?.possibly_undercounted ?? false,
      };
    })
    .sort((a, b) => b.extraDinersPerDay - a.extraDinersPerDay || byCentreId(a, b));

  const benchmark = benchmarkOf(prepared, assumptions);
  const actionThreshold = value(assumptions, 'actions.waste.extra_per_stall_share') * prepared.typicalDinersPerStall;
  const needsAction = (loads: { centreId: string; name: string; extraDinersPerStall: number | null }[]) =>
    loads
      .filter((l): l is NeaAction => l.extraDinersPerStall !== null && l.extraDinersPerStall > actionThreshold)
      .map(({ centreId, name, extraDinersPerStall }) => ({ centreId, name, extraDinersPerStall }))
      .sort(byWorstLoad);

  const cards = selectedIds.map((id): VerdictCard => {
    const name = centres.get(id)!.name;
    const without = regroup(prepared, new Set(planIds.filter((p) => p !== id)));
    const pushes = rises(prepared, extra, without.extra);
    return {
      centreId: id,
      name,
      shareOfDisplaced: displaced > 0 ? (planOutcome.displacedFrom.get(id) ?? 0) / displaced : 0,
      pushes,
      neaActions: needsAction(pushes),
      possiblyUndercounted: demand.get(id)?.possibly_undercounted ?? false,
      overlaps: overlapsFor(data, centres, id, planIds),
      accessLoss: Object.fromEntries(
        PACES.map((pace) => [pace, accessLoss[pace].blocks - without.accessLoss[pace].blocks])
      ) as Record<Pace, number>,
      ...verdict(prepared, assumptions, benchmark, `Closing ${name} too`, planOutcome, without),
    };
  });

  const anchorName = centres.get(anchorId)!.name;
  const anchorBroken = brokenRules(
    prepared,
    assumptions,
    benchmark,
    `Closing ${anchorName} on its own`,
    regroup(prepared, new Set([anchorId])),
    regroup(prepared, new Set())
  );
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const card of cards) counts[card.status] += 1;
  const plan: PlanLine = {
    status: cards.length > 0 ? worstStatus(cards.map((c) => c.status)) : null,
    counts,
    anchorProblems: anchorBroken.map((v) => v.reason),
  };

  // Same order as closure_scenarios' worst neighbour: most extra diners per stall, nulls last, then centre_id.
  const biggest = [...receivers].sort(byWorstLoad)[0];
  const tiles: Tiles = {
    displaced: {
      dinersPerDay: roundTo10(displaced),
      unservedDinersPerDay: roundTo10(unserved.dinersPerDay),
      tag: 'MODELLED',
      source: 'gold.block_options',
    },
    biggestLoad: {
      centre: biggest
        ? {
            centreId: biggest.centreId,
            name: biggest.name,
            extraDinersPerStall: biggest.extraDinersPerStall,
            pctOverBaseline: biggest.pctOverBaseline,
          }
        : null,
      tag: 'MODELLED',
      source: 'gold.block_options, gold.centres, gold.centre_demand',
    },
    accessLoss: {
      limitMin: prepared.limitMin,
      senior: accessLoss.senior.blocks,
      typical: accessLoss.typical.blocks,
      brisk: accessLoss.brisk.blocks,
      tag: 'MODELLED',
      source: 'gold.block_options',
    },
    verdict: {
      status: plan.status,
      counts,
      tag: 'MODELLED',
      source: 'gold.block_options, gold.centres, gold.centre_demand',
    },
  };

  const top = receivers[0];
  const takeaway: TakeawayParts = {
    closedCentreNames: planIds.map((id) => centres.get(id)!.name),
    displacedDinersPerDay: roundTo10(displaced),
    receiverCount: receivers.length,
    topReceiver: top ? { name: top.name, shareOfDisplaced: top.shareOfDisplaced } : null,
    unservedResidents: unserved.residents,
    seniorBlocksLosingAccess: accessLoss.senior.blocks,
    verdict: { status: plan.status, counts },
  };

  return {
    displacedDinersPerDay: displaced,
    receivers,
    unserved,
    accessLoss,
    tiles,
    takeaway,
    benchmark,
    cards,
    plan,
    neaActions: { threshold: actionThreshold, centres: needsAction(receivers) },
  };
}

interface Prepared {
  blocks: Block[];
  blocksById: Map<string, Block>;
  centres: Map<string, CentreRow>;
  demand: Map<string, CentreDemandRow>;
  limitMin: number;
  limitM: Record<Pace, number>;
  /** A typical centre's baseline diners per stall (`actions.waste.typical_centre_quantile` over centres with stalls). */
  typicalDinersPerStall: number;
  benchmark?: Benchmark;
}

// The same gold rows and assumptions are evaluated for every plan the planner tries, so group once.
const preparedCache = new WeakMap<GoldData, WeakMap<Assumptions, Prepared>>();

function prepare(data: GoldData, assumptions: Assumptions): Prepared {
  let byAssumptions = preparedCache.get(data);
  if (!byAssumptions) preparedCache.set(data, (byAssumptions = new WeakMap()));
  let prepared = byAssumptions.get(assumptions);
  if (!prepared) {
    const limitMin = value(assumptions, 'walk.limit_min');
    const blocks = groupBlocks(data.blockOptions, value(assumptions, 'walk.cutoff_m'));
    const stalls = new Map(data.centres.map((c) => [c.centre_id, c.cooked_food_stalls]));
    const baselinePerStall = data.centreDemand
      .filter((d) => (stalls.get(d.centre_id) ?? 0) > 0)
      .map((d) => d.baseline_diners_per_day / stalls.get(d.centre_id)!)
      .sort((a, b) => a - b);
    prepared = {
      blocks,
      blocksById: new Map(blocks.map((b) => [b.id, b])),
      centres: new Map(data.centres.map((c) => [c.centre_id, c])),
      demand: new Map(data.centreDemand.map((d) => [d.centre_id, d])),
      limitMin,
      limitM: Object.fromEntries(
        PACES.map((pace) => [pace, value(assumptions, `walk.pace.${pace}`) * limitMin * 60])
      ) as Record<Pace, number>,
      typicalDinersPerStall: quantile(baselinePerStall, value(assumptions, 'actions.waste.typical_centre_quantile')),
    };
    byAssumptions.set(assumptions, prepared);
  }
  return prepared;
}

interface Regrouped {
  /** Extra diners per day at each open centre that takes displaced diners. */
  extra: Map<string, number>;
  /** Displaced diners per day by the closed centre they used to go to. */
  displacedFrom: Map<string, number>;
  displaced: number;
  unserved: PlanResult['unserved'];
  accessLoss: Record<Pace, AccessLoss>;
  /** Blocks losing a centre within the limit at senior pace, plus blocks newly unserved at any distance. */
  cutOffBlockIds: Set<string>;
}

/** Moves every block whose nearest centre is closed, whole, to its nearest open centre. */
function regroup({ blocks, limitM }: Prepared, closed: Set<string>): Regrouped {
  const extra = new Map<string, number>();
  const displacedFrom = new Map<string, number>();
  let displaced = 0;
  const unserved = { blocks: 0, residents: 0, dinersPerDay: 0 };
  const accessLoss = Object.fromEntries(
    PACES.map((pace): [Pace, AccessLoss] => [pace, { blocks: 0, seniors: 0, blockIds: [] }])
  ) as Record<Pace, AccessLoss>;

  const cutOffBlockIds = new Set<string>();
  for (const block of blocks) {
    const before = block.options[0];
    if (!before || !closed.has(before.centreId)) continue;
    const after = block.options.find((o) => !closed.has(o.centreId));
    for (const pace of PACES) {
      if (before.walkM <= limitM[pace] && !(after && after.walkM <= limitM[pace])) {
        accessLoss[pace].blocks += 1;
        accessLoss[pace].seniors += block.seniors;
        accessLoss[pace].blockIds.push(block.id);
      }
    }
    if (!after || (before.walkM <= limitM.senior && after.walkM > limitM.senior)) cutOffBlockIds.add(block.id);
    if (!after) {
      unserved.blocks += 1;
      unserved.residents += block.residents;
      unserved.dinersPerDay += block.dinersPerDay;
      continue;
    }
    displaced += block.dinersPerDay;
    displacedFrom.set(before.centreId, (displacedFrom.get(before.centreId) ?? 0) + block.dinersPerDay);
    extra.set(after.centreId, (extra.get(after.centreId) ?? 0) + block.dinersPerDay);
  }
  return { extra, displacedFrom, displaced, unserved, accessLoss, cutOffBlockIds };
}

function perStall({ centres }: Prepared, centreId: string, extraDinersPerDay: number): number | null {
  const stalls = centres.get(centreId)!.cooked_food_stalls;
  return stalls > 0 ? extraDinersPerDay / stalls : null;
}

function byWorstLoad(
  a: { centreId: string; extraDinersPerStall: number | null },
  b: { centreId: string; extraDinersPerStall: number | null }
): number {
  return (b.extraDinersPerStall ?? -Infinity) - (a.extraDinersPerStall ?? -Infinity) || byCentreId(a, b);
}

type Verdict = Pick<VerdictCard, 'status' | 'rule' | 'reason' | 'cutOff' | 'pastBenchmark'>;

/** The plan against the plan without one centre: the first rule that fires decides. */
function verdict(...args: Parameters<typeof brokenRules>): Verdict {
  const broken = brokenRules(...args);
  if (broken.length > 0) return broken[0];
  const [prepared, , benchmark, subject, withPlan, without] = args;
  return {
    status: 'green',
    rule: null,
    reason: `${subject} cuts no one off and pushes no centre past the typical benchmark of ${fmt(benchmark.typical)}.`,
    cutOff: newlyCutOff(prepared, withPlan, without),
    pastBenchmark: [],
  };
}

/** Every rule the plan breaks against the plan without one centre, in rule order: Access, then Load. */
function brokenRules(
  prepared: Prepared,
  assumptions: Assumptions,
  benchmark: Benchmark,
  subject: string,
  withPlan: Regrouped,
  without: Regrouped
): Verdict[] {
  const broken: Verdict[] = [];
  const cutOff = newlyCutOff(prepared, withPlan, without);
  if (cutOff.blocks >= value(assumptions, 'verdict.access.min_new_blocks')) {
    const blocks = cutOff.blocks === 1 ? '1 more block' : `${cutOff.blocks} more blocks`;
    broken.push({
      status: 'red',
      rule: 'access',
      reason: `${subject} leaves ${blocks} (${cutOff.seniors} seniors) with no centre within ${prepared.limitMin} min at senior pace.`,
      cutOff,
      pastBenchmark: [],
    });
  }

  const pastRed = crossings(prepared, withPlan.extra, without.extra, benchmark.threeInFour);
  const pastTypical = crossings(prepared, withPlan.extra, without.extra, benchmark.typical);
  if (pastRed.length > 0 || pastTypical.length > 0) {
    const [status, past, label, level]: [Status, PastBenchmark[], string, number] =
      pastRed.length > 0
        ? ['red', pastRed, '3-in-4', benchmark.threeInFour]
        : ['yellow', pastTypical, 'typical', benchmark.typical];
    const pushes = joinNames(
      past.map(
        (p) =>
          `${p.name} to ${fmt(p.extraDinersPerStall)} extra diners per stall (${fmt(p.withoutThisCentre)} without it)`
      )
    );
    broken.push({
      status,
      rule: 'load',
      reason: `${subject} pushes ${pushes}, above the ${label} benchmark of ${fmt(level)}.`,
      cutOff,
      pastBenchmark: past,
    });
  }
  return broken;
}

function newlyCutOff(prepared: Prepared, withPlan: Regrouped, without: Regrouped): Verdict['cutOff'] {
  const ids = [...withPlan.cutOffBlockIds].filter((id) => !without.cutOffBlockIds.has(id));
  return { blocks: ids.length, seniors: ids.reduce((sum, id) => sum + prepared.blocksById.get(id)!.seniors, 0) };
}

function worstStatus(statuses: Status[]): Status {
  return statuses.includes('red') ? 'red' : statuses.includes('yellow') ? 'yellow' : 'green';
}

function joinNames(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

function overlapsFor(data: GoldData, centres: Map<string, CentreRow>, id: string, planIds: string[]): ClosureOverlap[] {
  const works = data.centreClosures.filter(
    (c): c is CentreClosureRow & { type: ClosurePeriod['type'] } =>
      (c.type === 'renovation' || c.type === 'redevelopment') && planIds.includes(c.centre_id)
  );
  const period = (c: (typeof works)[number]): ClosurePeriod => ({
    type: c.type,
    startDate: c.start_date,
    endDate: c.end_date,
  });
  return works
    .filter((own) => own.centre_id === id)
    .flatMap((own) =>
      works
        .filter((o) => o.centre_id !== id && o.start_date <= own.end_date && own.start_date <= o.end_date)
        .map((o) => ({
          withCentreId: o.centre_id,
          withName: centres.get(o.centre_id)!.name,
          own: period(own),
          other: period(o),
        }))
    );
}

/** Open centres whose extra diners per stall is higher with the plan than without one centre, most first. */
function rises(prepared: Prepared, withPlan: Map<string, number>, without: Map<string, number>): PastBenchmark[] {
  const risen: PastBenchmark[] = [];
  for (const [centreId, diners] of withPlan) {
    const after = perStall(prepared, centreId, diners);
    const before = perStall(prepared, centreId, without.get(centreId) ?? 0) ?? 0;
    if (after !== null && after > before) {
      risen.push({
        centreId,
        name: prepared.centres.get(centreId)!.name,
        extraDinersPerStall: after,
        withoutThisCentre: before,
      });
    }
  }
  return risen.sort(byWorstLoad);
}

/** Open centres above `threshold` extra diners per stall with the plan that weren't without the centre. */
function crossings(
  prepared: Prepared,
  withPlan: Map<string, number>,
  without: Map<string, number>,
  threshold: number
): PastBenchmark[] {
  return rises(prepared, withPlan, without).filter(
    (p) => p.extraDinersPerStall > threshold && p.withoutThisCentre <= threshold
  );
}

/** Typical and "3 in 4" extra diners per stall at the worst neighbour, over every single closure. */
function benchmarkOf(prepared: Prepared, assumptions: Assumptions): Benchmark {
  const typicalQuantile = value(assumptions, 'verdict.load.yellow_quantile');
  const threeInFourQuantile = value(assumptions, 'verdict.load.red_quantile');
  if (!prepared.benchmark) {
    const worst: number[] = [];
    for (const centre of prepared.centres.values()) {
      if (centre.is_interim) continue;
      const { extra } = regroup(prepared, new Set([centre.centre_id]));
      const loads = [...extra].map(([centreId, diners]) => perStall(prepared, centreId, diners));
      const top = Math.max(...loads.filter((l): l is number => l !== null));
      if (Number.isFinite(top)) worst.push(top);
    }
    worst.sort((a, b) => a - b);
    prepared.benchmark = {
      typical: quantile(worst, typicalQuantile),
      threeInFour: quantile(worst, threeInFourQuantile),
      typicalQuantile,
      threeInFourQuantile,
    };
  }
  return prepared.benchmark;
}

/** Linear interpolation between closest ranks, as Spark's `percentile`. */
function quantile(sorted: number[], q: number): number {
  // Empty only when no closure moves anybody, and then no plan has a receiver to compare.
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function groupBlocks(rows: BlockOptionRow[], cutoffM: number): Block[] {
  const blocks = new Map<string, Block>();
  for (const row of rows) {
    let block = blocks.get(row.block_id);
    if (!block) {
      block = {
        id: row.block_id,
        residents: row.est_residents,
        seniors: row.est_seniors,
        dinersPerDay: row.diners_per_day,
        options: [],
      };
      blocks.set(row.block_id, block);
    }
    if (row.centre_id !== null && row.walk_m !== null && row.walk_m <= cutoffM) {
      block.options.push({ centreId: row.centre_id, walkM: row.walk_m });
    }
  }
  for (const block of blocks.values()) {
    block.options.sort((a, b) => a.walkM - b.walkM || byCentreId(a, b));
  }
  return [...blocks.values()];
}

/** `centre_id` ascending, by code point to match Spark's ORDER BY. */
function byCentreId(a: { centreId: string }, b: { centreId: string }): number {
  return a.centreId < b.centreId ? -1 : a.centreId > b.centreId ? 1 : 0;
}

function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

function value(assumptions: Assumptions, key: string): number {
  const entry = assumptions[key];
  if (typeof entry?.value !== 'number') throw new Error(`assumptions.json has no number for "${key}"`);
  return entry.value;
}
