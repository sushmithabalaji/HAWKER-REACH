import type { Assumptions } from '../assumptions';
import { demandWasteOf, type DemandWaste } from './demandWaste';
import type { BlockOptionRow, CentreClosureRow, CentreDemandRow, CentreRow, GoldData } from './gold';

export interface Receiver {
  centreId: string;
  name: string;
  extraDinersPerDay: number;
  /** Extra diners per day ÷ `cooked_food_stalls`; null for a centre with no stalls, as in gold. */
  extraDinersPerStall: number | null;
  /** Extra diners as % of the centre's baseline. "new" when the centre has under 1 diner a day today. */
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
  /** Every block whose nearest centre closes, whether it moves or is left with none; for the map. */
  displacedBlockIds: string[];
  /** Open centres taking displaced diners, most extra diners first. */
  receivers: Receiver[];
  /** Blocks left with no open centre within the cutoff because of the plan. */
  unserved: { blocks: number; residents: number; dinersPerDay: number };
  accessLoss: Record<Pace, AccessLoss>;
  tiles: Tiles;
  takeaway: TakeawayParts;
  /** One per selected centre, in the order given: what changes because it closes together with the rest of the plan. */
  cards: VerdictCard[];
  /** The whole-plan line above the cards. */
  plan: PlanLine;
  /** Centres needing extra bins, collection and cleaning checks; never changes a colour. */
  neaActions: {
    /** A centre is flagged when its extra diners are more than this % of its diners today (`actions.waste.flag_pct`). */
    threshold: number;
    centres: NeaAction[];
  };
  /** Spec 4: every receiver with its load and extra waste, and the plan's waste total. */
  demandWaste: DemandWaste;
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

/** A centre that gets busier because two closures happen together. */
export interface Pushed {
  centreId: string;
  name: string;
  /** Extra diners as % of its diners today with the whole plan closed. */
  pct: number;
  /** The same % if the card's centre or the rest of the plan closed separately: the higher of the two. */
  ifApart: number;
}

export interface VerdictCard {
  centreId: string;
  name: string;
  status: Status;
  /** The first rule that fired, or null when green. */
  rule: 'share' | 'access' | 'load' | null;
  /** A few words, with the one number that decided it. */
  reason: string;
  /** Up to three lines for Read more, each with one number; only the ones that are not zero. */
  details: string[];
  /** Blocks (and their seniors) that lose a centre within the limit at senior pace only because this centre and the rest of the plan close together. */
  cutOff: { blocks: number; seniors: number };
  /** Share (0–1) of the rest of the plan's displaced diners that move to this centre when it stays open. */
  shareOfRest: number;
  /** Centres pushed past the load limit that set the colour. */
  overloaded: Pushed[];
  /** Share (0–1) of the plan's displaced diners whose nearest centre this is; information only. */
  shareOfDisplaced: number;
  /** Every centre that is busier closing together than in either closing separately, busiest first. */
  pushes: Pushed[];
  /** Blocks losing a centre within the limit at each pace only because this centre and the rest of the plan close together. */
  accessLoss: Record<Pace, number>;
  /** What this centre does when it closes on its own, as reasons; listed under the card, never setting its colour. */
  ownProblems: string[];
  /** Centres this closure sends above the NEA actions flag with the plan. */
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
  /** Null for a centre with no stalls recorded. */
  extraDinersPerStall: number | null;
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
  busiest: Tile & {
    /** The receiver with the highest % over its diners today ("new" ones left out); null when none has a %. */
    centre: Pick<Receiver, 'centreId' | 'name' | 'extraDinersPerStall' | 'pctOverBaseline'> | null;
  };
  accessLoss: Tile & Record<Pace, number> & { limitMin: number };
  verdict: Tile & Pick<PlanLine, 'status' | 'counts'>;
}

const PACES: Pace[] = ['senior', 'typical', 'brisk'];

export type PlanErrorCode = 'interim-centre' | 'too-many-centres' | 'unknown-centre' | 'duplicate-centre';

/** A plan the page must not evaluate; `message` is safe to show the planner. */
export class PlanError extends Error {
  readonly code: PlanErrorCode;

  constructor(code: PlanErrorCode, message: string) {
    super(message);
    this.code = code;
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
      return {
        centreId,
        name: centres.get(centreId)!.name,
        extraDinersPerDay,
        extraDinersPerStall: perStall(prepared, centreId, extraDinersPerDay),
        pctOverBaseline: pctOf(prepared, centreId, extraDinersPerDay) ?? 'new',
        shareOfDisplaced: extraDinersPerDay / displaced,
        possiblyUndercounted: demand.get(centreId)?.possibly_undercounted ?? false,
      };
    })
    .sort((a, b) => b.extraDinersPerDay - a.extraDinersPerDay || byCentreId(a, b));

  const flagPct = value(assumptions, 'actions.waste.flag_pct') * 100;
  const needsAction = (loads: Pick<Receiver, 'centreId' | 'name' | 'extraDinersPerStall' | 'pctOverBaseline'>[]) =>
    loads
      .filter((l) => l.pctOverBaseline === 'new' || l.pctOverBaseline > flagPct)
      .map(({ centreId, name, extraDinersPerStall }): NeaAction => ({ centreId, name, extraDinersPerStall }))
      .sort(byWorstLoad);

  const nea = needsAction(receivers);

  const cards = selectedIds.map((id): VerdictCard => {
    const rest = planIds.filter((p) => p !== id);
    const name = centres.get(id)!.name;
    const judged = judge(prepared, assumptions, rest, id);
    const without = regroup(prepared, new Set(rest));
    return {
      centreId: id,
      name,
      ...judged,
      shareOfDisplaced: displaced > 0 ? (planOutcome.displacedFrom.get(id) ?? 0) / displaced : 0,
      // Information, not part of the verdict: every centre this closure sends past the flag, alone or not.
      neaActions: needsAction(loadsOf(prepared, extra, without.extra)),
      possiblyUndercounted: demand.get(id)?.possibly_undercounted ?? false,
      overlaps: overlapsFor(data, centres, id, planIds),
      ownProblems: ownProblems(prepared, assumptions, id),
    };
  });

  const counts = { red: 0, yellow: 0, green: 0 };
  for (const card of cards) counts[card.status] += 1;
  const plan: PlanLine = {
    status: cards.length > 0 ? worstStatus(cards.map((c) => c.status)) : null,
    counts,
    anchorProblems: ownProblems(prepared, assumptions, anchorId),
  };

  // Same order as closure_scenarios' worst neighbour: most extra diners per stall, nulls last, then centre_id.
  const biggest = [...receivers].sort(byWorstLoad)[0];
  const busiest = [...receivers]
    .filter((r) => r.pctOverBaseline !== 'new')
    .sort((a, b) => (b.pctOverBaseline as number) - (a.pctOverBaseline as number) || byCentreId(a, b))[0];
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
    busiest: {
      centre: busiest
        ? {
            centreId: busiest.centreId,
            name: busiest.name,
            extraDinersPerStall: busiest.extraDinersPerStall,
            pctOverBaseline: busiest.pctOverBaseline,
          }
        : null,
      tag: 'MODELLED',
      source: 'gold.block_options, gold.centre_demand',
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
    displacedBlockIds: planOutcome.displacedBlockIds,
    receivers,
    unserved,
    accessLoss,
    tiles,
    takeaway,
    cards,
    plan,
    neaActions: { threshold: flagPct, centres: nea },
    demandWaste: demandWasteOf(
      receivers,
      new Map([...demand].map(([id, d]) => [id, d.baseline_diners_per_day])),
      new Set(nea.map((c) => c.centreId)),
      flagPct,
      assumptions
    ),
  };
}

interface Prepared {
  blocks: Block[];
  blocksById: Map<string, Block>;
  centres: Map<string, CentreRow>;
  demand: Map<string, CentreDemandRow>;
  limitMin: number;
  limitM: Record<Pace, number>;
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
    prepared = {
      blocks,
      blocksById: new Map(blocks.map((b) => [b.id, b])),
      centres: new Map(data.centres.map((c) => [c.centre_id, c])),
      demand: new Map(data.centreDemand.map((d) => [d.centre_id, d])),
      limitMin,
      limitM: Object.fromEntries(
        PACES.map((pace) => [pace, value(assumptions, `walk.pace.${pace}`) * limitMin * 60])
      ) as Record<Pace, number>,
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
  displacedBlockIds: string[];
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

  const displacedBlockIds: string[] = [];
  for (const block of blocks) {
    const before = block.options[0];
    if (!before || !closed.has(before.centreId)) continue;
    displacedBlockIds.push(block.id);
    const after = block.options.find((o) => !closed.has(o.centreId));
    for (const pace of PACES) {
      if (before.walkM <= limitM[pace] && !(after && after.walkM <= limitM[pace])) {
        accessLoss[pace].blocks += 1;
        accessLoss[pace].seniors += block.seniors;
        accessLoss[pace].blockIds.push(block.id);
      }
    }
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
  return { extra, displacedFrom, displaced, unserved, accessLoss, displacedBlockIds };
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

type Judgement = Pick<
  VerdictCard,
  'status' | 'rule' | 'reason' | 'details' | 'cutOff' | 'shareOfRest' | 'overloaded' | 'pushes' | 'accessLoss'
>;

// The same diners summed in a different order differ by rounding error, which is not a rise.
const NO_RISE = 1e-9;

/** % over a centre's diners today; null for a centre with under 1 a day, which has no % to compare. */
function pctOf(prepared: Prepared, centreId: string, extraDiners: number): number | null {
  const baseline = prepared.demand.get(centreId)?.baseline_diners_per_day ?? 0;
  return baseline >= 1 ? (extraDiners / baseline) * 100 : null;
}

/** Every receiver of an `extra` map with its load and % over today, for the NEA actions flag. */
function loadsOf(
  prepared: Prepared,
  withPlan: Map<string, number>,
  without: Map<string, number>
): Pick<Receiver, 'centreId' | 'name' | 'extraDinersPerStall' | 'pctOverBaseline'>[] {
  return [...withPlan]
    .filter(([centreId, diners]) => diners > (without.get(centreId) ?? 0) + NO_RISE)
    .map(([centreId, diners]) => ({
      centreId,
      name: prepared.centres.get(centreId)!.name,
      extraDinersPerStall: perStall(prepared, centreId, diners),
      pctOverBaseline: pctOf(prepared, centreId, diners) ?? ('new' as const),
    }));
}

/**
 * "Can X close together with the rest of the plan?" Only what the two do together counts, never what either does
 * alone: X's share of the rest's displaced diners, blocks cut off only when both close, and third centres pushed past
 * a load limit only when both close.
 */
function judge(prepared: Prepared, assumptions: Assumptions, restIds: string[], xId: string): Judgement {
  const redShare = value(assumptions, 'verdict.share.red');
  const yellowShare = value(assumptions, 'verdict.share.yellow');
  const redLoad = value(assumptions, 'verdict.load.red_pct') * 100;
  const yellowLoad = value(assumptions, 'verdict.load.yellow_pct') * 100;
  const minBlocks = value(assumptions, 'verdict.access.min_new_blocks');
  const xName = prepared.centres.get(xId)!.name;
  const restName = restIds.length === 1 ? `${prepared.centres.get(restIds[0])!.name}’s` : 'the rest of the plan’s';

  const rest = regroup(prepared, new Set(restIds));
  const alone = regroup(prepared, new Set([xId]));
  const both = regroup(prepared, new Set([...restIds, xId]));

  const shareOfRest = rest.displaced > 0 ? (rest.extra.get(xId) ?? 0) / rest.displaced : 0;

  const strandedIn = (r: Regrouped) => r.accessLoss.senior.blockIds;
  const accessLoss = Object.fromEntries(
    PACES.map((pace) => [
      pace,
      both.accessLoss[pace].blockIds.filter(
        (b) => !rest.accessLoss[pace].blockIds.includes(b) && !alone.accessLoss[pace].blockIds.includes(b)
      ).length,
    ])
  ) as Record<Pace, number>;
  const newStranded = strandedIn(both).filter((b) => !strandedIn(rest).includes(b) && !strandedIn(alone).includes(b));
  const cutOff = {
    blocks: newStranded.length,
    seniors: newStranded.reduce((sum, id) => sum + prepared.blocksById.get(id)!.seniors, 0),
  };

  // Third centres: busier closing both than in either closing separately.
  const pushes: Pushed[] = [];
  for (const [centreId, diners] of both.extra) {
    if (centreId === xId || restIds.includes(centreId)) continue;
    const pct = pctOf(prepared, centreId, diners);
    if (pct === null) continue;
    const ifApart = Math.max(
      pctOf(prepared, centreId, rest.extra.get(centreId) ?? 0) ?? 0,
      pctOf(prepared, centreId, alone.extra.get(centreId) ?? 0) ?? 0
    );
    if (pct > ifApart + NO_RISE) pushes.push({ centreId, name: prepared.centres.get(centreId)!.name, pct, ifApart });
  }
  pushes.sort((a, b) => b.pct - a.pct || byCentreId(a, b));
  const overRed = pushes.filter((p) => p.pct > redLoad && p.ifApart <= redLoad);
  const overYellow = pushes.filter((p) => p.pct > yellowLoad && p.pct <= redLoad && p.ifApart <= yellowLoad);

  const whole = (n: number) => Math.round(n);
  const lose = `${cutOff.blocks} ${cutOff.blocks === 1 ? 'block loses' : 'blocks lose'} a centre within ${prepared.limitMin} min`;
  const worstThird = overRed[0] ?? overYellow[0];
  const details = [
    shareOfRest > 0 && `${xName} takes ${whole(shareOfRest * 100)}% of ${restName} diners`,
    cutOff.blocks > 0 &&
      `${cutOff.blocks} more ${cutOff.blocks === 1 ? 'block loses' : 'blocks lose'} a centre within ${prepared.limitMin} min if both close`,
    worstThird && `${worstThird.name} would get ${whole(worstThird.pct)}% busier`,
  ].filter((d): d is string => Boolean(d));

  const verdict = (status: Status, rule: Judgement['rule'], reason: string): Judgement => ({
    status,
    rule,
    reason,
    details,
    cutOff,
    shareOfRest,
    overloaded: rule === 'load' ? (status === 'red' ? overRed : overYellow) : [],
    pushes,
    accessLoss,
  });
  const share = `Takes ${whole(shareOfRest * 100)}% of ${restName} diners`;
  if (shareOfRest >= redShare) return verdict('red', 'share', share);
  if (cutOff.blocks >= minBlocks) return verdict('red', 'access', lose);
  if (overRed.length > 0) return verdict('red', 'load', `${overRed[0].name} gets ${whole(overRed[0].pct)}% busier`);
  if (shareOfRest >= yellowShare) return verdict('yellow', 'share', share);
  if (overYellow.length > 0) {
    return verdict('yellow', 'load', `${overYellow[0].name} gets ${whole(overYellow[0].pct)}% busier`);
  }
  return verdict('green', null, 'Too far apart to overlap');
}

/** What closing a centre on its own does, as reasons: for the line under its card, never for its colour. */
function ownProblems(prepared: Prepared, assumptions: Assumptions, id: string): string[] {
  const name = prepared.centres.get(id)!.name;
  const alone = regroup(prepared, new Set([id]));
  const blocks = alone.accessLoss.senior.blockIds;
  const redLoad = value(assumptions, 'verdict.load.red_pct') * 100;
  const problems: string[] = [];
  if (blocks.length >= value(assumptions, 'verdict.access.min_new_blocks')) {
    const seniors = blocks.reduce((sum, b) => sum + prepared.blocksById.get(b)!.seniors, 0);
    problems.push(
      `Closing ${name} on its own leaves ${blocks.length === 1 ? '1 more block' : `${blocks.length} more blocks`} (${roughSeniors(seniors)} seniors) with no centre within ${prepared.limitMin} min at senior pace.`
    );
  }
  const busy = [...alone.extra]
    .map(([centreId, diners]) => ({ centreId, pct: pctOf(prepared, centreId, diners) }))
    .filter((c): c is { centreId: string; pct: number } => c.pct !== null && c.pct > redLoad)
    .sort((a, b) => b.pct - a.pct || byCentreId(a, b));
  if (busy.length > 0) {
    const names = joinNames(busy.map((c) => `${prepared.centres.get(c.centreId)!.name} (${Math.round(c.pct)}%)`));
    problems.push(`Closing ${name} on its own makes ${names} more than ${Math.round(redLoad)}% busier.`);
  }
  return problems;
}

function worstStatus(statuses: Status[]): Status {
  return statuses.includes('red') ? 'red' : statuses.includes('yellow') ? 'yellow' : 'green';
}

function joinNames(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// Seniors per block are estimates, so they are shown to the nearest 5, and under 5 as "<5" (ASSUMPTIONS.md, display rounding).
function roughSeniors(n: number): string {
  if (n < 5) return n > 0 ? '<5' : '0';
  return (Math.round(n / 5) * 5).toLocaleString('en-US');
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
