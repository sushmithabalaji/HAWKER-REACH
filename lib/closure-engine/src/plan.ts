import type { Assumptions, BlockOptionRow, GoldData } from "./gold";

export interface Receiver {
  centreId: string;
  name: string;
  extraDinersPerDay: number;
  /** Extra diners per day ÷ `cooked_food_stalls`. */
  extraDinersPerStall: number;
  /** Extra diners as % of the centre's baseline; information only. "new" when the baseline is 0. */
  pctOverBaseline: number | "new";
  /** Share (0–1) of the plan's displaced diners this centre takes. */
  shareOfDisplaced: number;
}

export type Pace = "senior" | "typical" | "brisk";

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
}

interface Tile {
  tag: "MODELLED";
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
    centre: Pick<Receiver, "centreId" | "name" | "extraDinersPerStall" | "pctOverBaseline"> | null;
  };
  accessLoss: Tile & Record<Pace, number> & { limitMin: number };
}

const PACES: Pace[] = ["senior", "typical", "brisk"];

export type PlanErrorCode = "interim-centre" | "too-many-centres";

/** A plan the page must not evaluate; `message` is safe to show the planner. */
export class PlanError extends Error {
  constructor(
    readonly code: PlanErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PlanError";
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
  assumptions: Assumptions,
): PlanResult {
  const maxSelected = value(assumptions, "plan.max_extra_centres");
  if (selectedIds.length > maxSelected) {
    throw new PlanError("too-many-centres", `Up to ${maxSelected} at once. Remove one to add another.`);
  }
  const centres = new Map(data.centres.map((c) => [c.centre_id, c]));
  for (const id of [anchorId, ...selectedIds]) {
    const centre = centres.get(id);
    if (centre?.is_interim) {
      throw new PlanError("interim-centre", `${centre.name} is an interim centre and can't be closed in a plan.`);
    }
  }

  const cutoffM = value(assumptions, "walk.cutoff_m");
  const closed = new Set([anchorId, ...selectedIds]);
  const extra = new Map<string, number>();
  let displaced = 0;
  const unserved = { blocks: 0, residents: 0, dinersPerDay: 0 };
  const limitS = value(assumptions, "walk.limit_min") * 60;
  const limitM = Object.fromEntries(
    PACES.map((pace) => [pace, value(assumptions, `walk.pace.${pace}`) * limitS]),
  ) as Record<Pace, number>;
  const accessLoss = Object.fromEntries(
    PACES.map((pace): [Pace, AccessLoss] => [pace, { blocks: 0, seniors: 0, blockIds: [] }]),
  ) as Record<Pace, AccessLoss>;

  for (const block of groupBlocks(data.blockOptions, cutoffM)) {
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
    if (!after) {
      unserved.blocks += 1;
      unserved.residents += block.residents;
      unserved.dinersPerDay += block.dinersPerDay;
      continue;
    }
    displaced += block.dinersPerDay;
    extra.set(after.centreId, (extra.get(after.centreId) ?? 0) + block.dinersPerDay);
  }

  const demand = new Map(data.centreDemand.map((d) => [d.centre_id, d]));
  const receivers = [...extra]
    .map(([centreId, extraDinersPerDay]): Receiver => {
      const baseline = demand.get(centreId)?.baseline_diners_per_day ?? 0;
      return {
        centreId,
        name: centres.get(centreId)!.name,
        extraDinersPerDay,
        extraDinersPerStall: extraDinersPerDay / centres.get(centreId)!.cooked_food_stalls,
        pctOverBaseline: baseline > 0 ? (extraDinersPerDay / baseline) * 100 : "new",
        shareOfDisplaced: extraDinersPerDay / displaced,
      };
    })
    .sort((a, b) => b.extraDinersPerDay - a.extraDinersPerDay);

  const limitMin = value(assumptions, "walk.limit_min");
  const biggest = receivers.reduce<Receiver | null>(
    (worst, r) => (!worst || r.extraDinersPerStall > worst.extraDinersPerStall ? r : worst),
    null,
  );
  const tiles: Tiles = {
    displaced: {
      dinersPerDay: roundTo10(displaced),
      unservedDinersPerDay: roundTo10(unserved.dinersPerDay),
      tag: "MODELLED",
      source: "gold.block_options",
    },
    biggestLoad: {
      centre: biggest && {
        centreId: biggest.centreId,
        name: biggest.name,
        extraDinersPerStall: biggest.extraDinersPerStall,
        pctOverBaseline: biggest.pctOverBaseline,
      },
      tag: "MODELLED",
      source: "gold.block_options, gold.centres, gold.centre_demand",
    },
    accessLoss: {
      limitMin,
      senior: accessLoss.senior.blocks,
      typical: accessLoss.typical.blocks,
      brisk: accessLoss.brisk.blocks,
      tag: "MODELLED",
      source: "gold.block_options",
    },
  };

  const top = receivers[0];
  const takeaway: TakeawayParts = {
    closedCentreNames: [anchorId, ...selectedIds].map((id) => centres.get(id)?.name ?? id),
    displacedDinersPerDay: roundTo10(displaced),
    receiverCount: receivers.length,
    topReceiver: top ? { name: top.name, shareOfDisplaced: top.shareOfDisplaced } : null,
    unservedResidents: unserved.residents,
    seniorBlocksLosingAccess: accessLoss.senior.blocks,
  };

  return { displacedDinersPerDay: displaced, receivers, unserved, accessLoss, tiles, takeaway };
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
    block.options.sort(
      (a, b) => a.walkM - b.walkM || (a.centreId < b.centreId ? -1 : 1),
    );
  }
  return [...blocks.values()];
}

function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

function value(assumptions: Assumptions, key: string): number {
  const entry = assumptions[key];
  if (!entry) throw new Error(`assumptions.json has no "${key}"`);
  return entry.value;
}
