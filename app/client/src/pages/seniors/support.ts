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

export function supportFor(o: BlockOutcome): BlockSupport {
  return o.afterCentreId !== null ? 'Shuttle' : 'Meal delivery or vouchers';
}

const KM = `${CUTOFF_M / 1000} km`;

// The rules in words, for the Assumptions panel.
export const SUPPORT_RULES: Record<Support, string> = {
  Shuttle: `an open centre is still within ${KM}: one shuttle per area picks up from its cut-off blocks and takes seniors to the nearest open centre`,
  'Meal delivery or vouchers': `a cut-off block has no open centre within ${KM}`,
  'Volunteer check-ins': 'a super-aged area where some block has no centre anyone can walk to (T1 → T4)',
  'Temporary food point': `at least ${FOOD_POINT_MIN_SENIORS} seniors in the area have no open centre within ${KM}`,
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
  // The subzone's block with the longest walk after the closure; its next centre is the area's alternative.
  furthest: SupportBlock;
  supports: SupportNeed[]; // in SUPPORTS order
  blocks: SupportBlock[]; // furthest walk first
}

// Walk after the closure, with no centre in range as the furthest of all.
const walkAfter = (o: BlockOutcome) => o.afterWalkM ?? Infinity;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The supports an area's conditions trigger, each with its reason.
export function supportsFor(blocks: readonly SupportBlock[], superAged: boolean): SupportNeed[] {
  const inRange = blocks.filter((b) => b.support === 'Shuttle');
  const outOfRange = blocks.filter((b) => b.support === 'Meal delivery or vouchers');
  const seniorsOutOfRange = outOfRange.reduce((sum, b) => sum + b.outcome.block.est_seniors, 0);
  const needs: SupportNeed[] = [];
  if (inRange.length > 0) {
    needs.push({
      support: 'Shuttle',
      reason: `${plural(inRange.length, 'block has', 'blocks have')} a centre within ${KM}`,
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
export function mealSupportList(
  outcomes: readonly BlockOutcome[],
  isSuperAged: (subzoneId: string) => boolean
): SupportArea[] {
  const bySubzone = new Map<string, SupportBlock[]>();
  for (const outcome of outcomes) {
    if (outcome.group !== 'cut-off') continue;
    const id = outcome.block.subzone_id;
    bySubzone.set(id, [...(bySubzone.get(id) ?? []), { outcome, support: supportFor(outcome) }]);
  }
  return [...bySubzone.entries()]
    .map(([subzone_id, unsorted]) => {
      const blocks = unsorted.sort((a, b) => walkAfter(b.outcome) - walkAfter(a.outcome));
      return {
        subzone_id,
        seniors: blocks.reduce((sum, b) => sum + b.outcome.block.est_seniors, 0),
        furthest: blocks[0],
        supports: supportsFor(blocks, isSuperAged(subzone_id)),
        blocks,
      };
    })
    .sort((a, b) => b.seniors - a.seniors);
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
] as const;

// "a,b" and quotes inside a value are quoted, as in RFC 4180.
const csvCell = (v: string | number) => {
  const text = String(v);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Block-level CSV of the list, every affected area included, with its priority as yes or no and the area's
// supports joined by "; ". Seniors are rounded to 5 as on the page, but as plain numbers (under 5 is 0)
// so the column sums in a spreadsheet.
export function supportCsv(areas: readonly SupportArea[], names: Names, priorityIds: ReadonlySet<string>): string {
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
    ])
  );
  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
