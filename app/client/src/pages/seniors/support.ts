import { roundedCount, type BlockOutcome } from './scenario';
import { CUTOFF_M, FOOD_POINT_MIN_SENIORS } from './settings';
import type { Names } from './names';

// Suggested support (ASSUMPTIONS.md, suggested support). Every area gets its alternative centre; on top of
// that it shows only the supports its conditions trigger, never the full menu. Walking buddies are gone:
// asking seniors to walk further isn't the answer.
export const SUPPORTS = [
  'Shuttle',
  'Meal delivery or vouchers',
  'Volunteer check-ins',
  'Temporary food point',
] as const;
export type Support = (typeof SUPPORTS)[number];

// A block's own support, for its row and the CSV: a shuttle if an open centre is still within the cutoff,
// otherwise meals brought to it.
export type BlockSupport = Extract<Support, 'Shuttle' | 'Meal delivery or vouchers'>;

const inRange = (o: BlockOutcome) => o.afterCentreId !== null;

export function supportFor(o: BlockOutcome): BlockSupport {
  return inRange(o) ? 'Shuttle' : 'Meal delivery or vouchers';
}

const KM = `${CUTOFF_M / 1000} km`;

// The rules in words, for the Assumptions panel.
// A block's reason, for its row's hover text.
export const blockReason = (o: BlockOutcome) => (inRange(o) ? `A centre is within ${KM}` : `No centre within ${KM}`);

export const SUPPORT_RULES: Record<Support, string> = {
  Shuttle: `an open centre is still within ${KM}: one shuttle per area picks up from its cut-off blocks and takes seniors to the nearest open centre`,
  'Meal delivery or vouchers': `a cut-off block has no open centre within ${KM}`,
  'Volunteer check-ins': 'a super-aged area where some block has no centre anyone can walk to (T1 → T4)',
  'Temporary food point': `at least ${FOOD_POINT_MIN_SENIORS} seniors cut off in the area have no open centre within ${KM}`,
};

export interface SupportNeed {
  support: Support;
  reason: string; // short, for the hover text
}

export interface SupportBlock {
  outcome: BlockOutcome;
  support: BlockSupport;
}

export interface SupportArea {
  subzone_id: string;
  seniors: number;
  // The open centre nearest any of the area's cut-off blocks, where its shuttle goes; null if none is in range.
  alternative: { centreId: string; walkM: number } | null;
  supports: SupportNeed[]; // in SUPPORTS order
  blocks: SupportBlock[]; // most vulnerable first: see byVulnerability
}

// Walk after the closure, with no centre in range as the furthest of all.
const walkAfter = (o: BlockOutcome) => o.afterWalkM ?? Infinity;

// The order blocks are ranked in within an area (#114): seniors no one can walk a centre for first (T1 → T4),
// then the most seniors, then the longest walk left, then block id so the rank never flickers.
export function byVulnerability(a: SupportBlock, b: SupportBlock): number {
  return (
    Number(b.outcome.noOneCanWalk) - Number(a.outcome.noOneCanWalk) ||
    b.outcome.block.est_seniors - a.outcome.block.est_seniors ||
    walkAfter(b.outcome) - walkAfter(a.outcome) ||
    a.outcome.block.block_id.localeCompare(b.outcome.block.block_id)
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The supports an area's conditions trigger, each with its reason. superAged is null until the share aged
// 65+ loads, so check-ins wait rather than quietly drop out.
export function supportsFor(blocks: readonly SupportBlock[], superAged: boolean | null): SupportNeed[] {
  const near = blocks.filter((b) => inRange(b.outcome));
  const outOfRange = blocks.filter((b) => !inRange(b.outcome));
  const seniorsOutOfRange = outOfRange.reduce((sum, b) => sum + b.outcome.block.est_seniors, 0);
  const needs: SupportNeed[] = [];
  if (near.length > 0) {
    needs.push({
      support: 'Shuttle',
      reason: `Too far to walk, but ${plural(near.length, 'block has', 'blocks have')} a centre within ${KM}`,
    });
  }
  if (outOfRange.length > 0) {
    needs.push({
      support: 'Meal delivery or vouchers',
      reason: `${plural(outOfRange.length, 'block has', 'blocks have')} no centre within ${KM}`,
    });
  }
  if (superAged && blocks.some((b) => b.outcome.noOneCanWalk)) {
    needs.push({
      support: 'Volunteer check-ins',
      reason: 'Super-aged, and some seniors can no longer walk to a centre',
    });
  }
  if (seniorsOutOfRange >= FOOD_POINT_MIN_SENIORS) {
    needs.push({
      support: 'Temporary food point',
      reason: `${FOOD_POINT_MIN_SENIORS}+ seniors here have no centre within ${KM}`,
    });
  }
  return needs;
}

// One row per subzone with seniors cut off, most seniors first, with its blocks underneath.
export function supportList(
  outcomes: readonly BlockOutcome[],
  isSuperAged: ((subzoneId: string) => boolean) | null
): SupportArea[] {
  const bySubzone = new Map<string, SupportBlock[]>();
  for (const outcome of outcomes) {
    if (outcome.group !== 'cut-off') continue;
    const id = outcome.block.subzone_id;
    bySubzone.set(id, [...(bySubzone.get(id) ?? []), { outcome, support: supportFor(outcome) }]);
  }
  return [...bySubzone.entries()]
    .map(([subzone_id, unsorted]) => {
      const blocks = unsorted.sort(byVulnerability);
      // The area's shuttle goes from its block with the shortest walk left to an open centre.
      const nearest = blocks.reduce((best, b) => (walkAfter(b.outcome) < walkAfter(best.outcome) ? b : best)).outcome;
      return {
        subzone_id,
        seniors: blocks.reduce((sum, b) => sum + b.outcome.block.est_seniors, 0),
        alternative:
          nearest.afterCentreId !== null && nearest.afterWalkM !== null
            ? { centreId: nearest.afterCentreId, walkM: nearest.afterWalkM }
            : null,
        supports: supportsFor(blocks, isSuperAged ? isSuperAged(subzone_id) : null),
        blocks,
      };
    })
    .sort((a, b) => b.seniors - a.seniors);
}

// The support list shows this many areas until the user asks for all of them.
export const TOP_AREAS = 5;

// Priority areas first, then the rest, each keeping its order (most seniors cut off first). With no
// priority ids yet (super-aged flags still loading), the order is unchanged.
export function rankAreas<T extends { subzone_id: string }>(
  areas: readonly T[],
  priorityIds: ReadonlySet<string> | null
): T[] {
  if (!priorityIds) return [...areas];
  return [
    ...areas.filter((a) => priorityIds.has(a.subzone_id)),
    ...areas.filter((a) => !priorityIds.has(a.subzone_id)),
  ];
}

const CSV_COLUMNS = [
  'subzone_id',
  'subzone',
  'block_id',
  'block',
  'est_seniors',
  'tier_before',
  'tier_after',
  'nearest_open_centre',
  'walk_m_after',
  'block_support',
  'area_supports',
  'priority',
  'vulnerability_multiplier',
] as const;

// "a,b" and quotes inside a value are quoted, as in RFC 4180.
const csvCell = (v: string | number) => {
  const text = String(v);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Block-level CSV of the list, every affected area included, with its priority as yes or no and the area's
// supports joined by "; ". Seniors are rounded to 5 as on the page, but as plain numbers (under 5 is 0)
// so the column sums in a spreadsheet.
export function supportCsv(
  areas: readonly SupportArea[],
  names: Names,
  priorityIds: ReadonlySet<string>,
  multiplierOf: (subzoneId: string) => number | null
): string {
  const rows = areas.flatMap((area) =>
    area.blocks.map(({ outcome: o, support }) => [
      area.subzone_id,
      names.subzone(area.subzone_id),
      o.block.block_id,
      o.block.block_label,
      roundedCount(o.block.est_seniors),
      o.block.tier_now,
      o.after,
      names.centre(o.afterCentreId),
      o.afterWalkM === null ? '' : Math.round(o.afterWalkM),
      support,
      area.supports.map((s) => s.support).join('; '),
      priorityIds.has(area.subzone_id) ? 'yes' : 'no',
      multiplierOf(area.subzone_id)?.toFixed(2) ?? '',
    ])
  );
  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
