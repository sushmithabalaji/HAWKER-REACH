import { roughCount, type BlockOutcome } from './scenario';
import { MEAL_SUPPORT_WALK_M } from './settings';

// Ordered mildest first, so the stricter of two is the later one.
export const SUPPORTS = ['Walking buddy', 'Meal delivery'] as const;
export type Support = (typeof SUPPORTS)[number];

// Walking buddy if the nearest open centre after the closure is within the meal-support walk at the
// senior pace; meal delivery if it's further or there's no centre within the cutoff.
export function supportFor(o: BlockOutcome): Support {
  return o.afterWalkM !== null && o.afterWalkM <= MEAL_SUPPORT_WALK_M ? 'Walking buddy' : 'Meal delivery';
}

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

// Block-level CSV of the list. Seniors are rounded as on the page; names come from the page's lookups.
export function supportCsv(
  areas: readonly SupportArea[],
  subzoneName: (id: string) => string,
  centreName: (id: string | null) => string
): string {
  const rows = areas.flatMap((area) =>
    area.blocks.map(({ outcome: o, support }) => [
      area.subzone_id,
      subzoneName(area.subzone_id),
      o.block.block_id,
      o.block.block_label,
      roughCount(o.block.est_seniors),
      o.block.tier_now,
      o.after,
      centreName(o.afterCentreId),
      o.afterWalkM === null ? '' : Math.round(o.afterWalkM),
      support,
    ])
  );
  return [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
