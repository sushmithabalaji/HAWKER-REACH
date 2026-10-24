import { roundedCount, type BlockOutcome } from './scenario';
import { CUTOFF_M, MEAL_SUPPORT_WALK_M, MEAL_SUPPORT_WALK_MIN, PACES } from './settings';
import type { Names } from './names';

// Ordered mildest first, so the stricter of two is the later one.
export const SUPPORTS = ['Walking buddy', 'Meal delivery'] as const;
export type Support = (typeof SUPPORTS)[number];

// Walking buddy if the nearest open centre after the closure is within the meal-support walk at the
// senior pace; meal delivery if it's further or there's no centre within the cutoff.
export function supportFor(o: BlockOutcome): Support {
  return o.afterWalkM !== null && o.afterWalkM <= MEAL_SUPPORT_WALK_M ? 'Walking buddy' : 'Meal delivery';
}

// The rule in words, for the list's footer and the Assumptions panel.
export const MEAL_SUPPORT_RULE = `Walking buddy if the nearest open centre after the closure is within ${MEAL_SUPPORT_WALK_M.toLocaleString('en-US')} m (${MEAL_SUPPORT_WALK_MIN} min at ${PACES[0]} m/s); meal delivery if it's further or there's no centre within ${CUTOFF_M / 1000} km. A subzone takes the stricter suggestion of its blocks`;

const stricter = (a: Support, b: Support) => (SUPPORTS.indexOf(a) >= SUPPORTS.indexOf(b) ? a : b);

export interface SupportBlock {
  outcome: BlockOutcome;
  support: Support;
}

export interface SupportArea {
  subzone_id: string;
  seniors: number;
  // The subzone's block with the longest walk after the closure; its suggestion is the subzone's.
  furthest: SupportBlock;
  support: Support;
  blocks: SupportBlock[]; // furthest walk first
}

// Walk after the closure, with no centre in range as the furthest of all.
const walkAfter = (o: BlockOutcome) => o.afterWalkM ?? Infinity;

// One row per subzone with seniors cut off, most seniors first, with its blocks underneath.
export function mealSupportList(outcomes: readonly BlockOutcome[]): SupportArea[] {
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
        support: blocks.map((b) => b.support).reduce(stricter),
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
  'suggested_support',
] as const;

// "a,b" and quotes inside a value are quoted, as in RFC 4180.
const csvCell = (v: string | number) => {
  const text = String(v);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Block-level CSV of the list. Seniors are rounded to 5 as on the page, but as plain numbers (under 5 is 0)
// so the column sums in a spreadsheet.
export function supportCsv(areas: readonly SupportArea[], names: Names): string {
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
    ])
  );
  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
