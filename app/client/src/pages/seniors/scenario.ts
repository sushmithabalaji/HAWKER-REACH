import {
  isMissing,
  toNumber,
  toNumberOrNull,
  toText,
  type RawRow,
  type RawValue,
} from '@/components/shared/queryValues';
import { LIMIT_MIN, PACES } from './settings';

export const TIERS = ['T1', 'T2', 'T3', 'T4'] as const;
export type Tier = (typeof TIERS)[number];

// Same bands as tiers.py, which built tier_now in 04_gold_access.
export function tierOf(walkM: number | null, limitMin = LIMIT_MIN): Tier {
  if (walkM === null) return 'T4';
  const i = PACES.findIndex((pace) => walkM <= pace * limitMin * 60);
  return i === -1 ? 'T4' : TIERS[i];
}

// The furthest walk in T1, T2 and T3 at this limit.
export function tierReachM(limitMin = LIMIT_MIN): number[] {
  return PACES.map((pace) => pace * limitMin * 60);
}

// A row of gold.block_access (config/queries/seniors_blocks.sql), parsed by toAccessBlocks.
export interface AccessBlock {
  block_id: string;
  block_label: string;
  subzone_id: string;
  pln_area_n: string;
  lon: number;
  lat: number;
  est_seniors: number;
  tier_now: Tier;
  // Its nearest, second and third centres within the 2 km cutoff, nearest first. Empty if none is in range.
  options: { centre_id: string; walk_m: number }[];
}

function toTier(v: RawValue): Tier {
  const t = toText(v);
  return (TIERS as readonly string[]).includes(t) ? (t as Tier) : 'T4';
}

// Null for a block with no coordinates, which the map couldn't place.
export function toAccessBlock(row: RawRow): AccessBlock | null {
  const lon = toNumberOrNull(row.lon);
  const lat = toNumberOrNull(row.lat);
  if (lon === null || lat === null) return null;
  const options = (['nearest', 'second', 'third'] as const).flatMap((rank) => {
    const id = row[`${rank}_centre_id`];
    const walk = row[`${rank}_walk_m`];
    return isMissing(id) || isMissing(walk) ? [] : [{ centre_id: toText(id), walk_m: toNumber(walk) }];
  });
  return {
    block_id: toText(row.block_id),
    block_label: toText(row.block_label ?? ''),
    subzone_id: toText(row.subzone_id ?? ''),
    pln_area_n: toText(row.pln_area_n ?? ''),
    lon,
    lat,
    est_seniors: toNumberOrNull(row.est_seniors) ?? 0,
    tier_now: toTier(row.tier_now),
    options,
  };
}

export function toAccessBlocks(rows: readonly RawRow[]): AccessBlock[] {
  return rows.flatMap((row) => toAccessBlock(row) ?? []);
}

// The centre picked to close, plus any other renovation or redevelopment closure overlapping its dates.
export interface Closure {
  centreId: string;
  alsoClosed: readonly string[];
}

export type Group = 'cut-off' | 'already-without' | 'unaffected';
export const GROUPS: Group[] = ['cut-off', 'already-without', 'unaffected'];

export interface BlockOutcome {
  block: AccessBlock;
  after: Tier;
  // The next centre still open, or null if the second and third are closed or out of range.
  afterCentreId: string | null;
  afterWalkM: number | null;
  group: Group;
  noOneCanWalk: boolean; // cut off, T1 → T4
  nowWorse: boolean; // already without, T2/T3 → T4
}

// Blocks whose nearest centre is the one picked, and where their seniors walk instead (ASSUMPTIONS.md,
// closures handled). Blocks whose nearest centre stays open are not part of the scenario.
export function runScenario(blocks: readonly AccessBlock[], closure: Closure): BlockOutcome[] {
  const closed = new Set([closure.centreId, ...closure.alsoClosed]);
  return blocks
    .filter((b) => b.options[0]?.centre_id === closure.centreId)
    .map((block) => {
      const next = block.options.slice(1).find((o) => !closed.has(o.centre_id)) ?? null;
      const after = tierOf(next?.walk_m ?? null);
      const before = block.tier_now;
      const group: Group = before !== 'T1' ? 'already-without' : after === 'T1' ? 'unaffected' : 'cut-off';
      return {
        block,
        after,
        afterCentreId: next?.centre_id ?? null,
        afterWalkM: next?.walk_m ?? null,
        group,
        noOneCanWalk: group === 'cut-off' && after === 'T4',
        nowWorse: (before === 'T2' || before === 'T3') && after === 'T4',
      };
    });
}

// Blocks and their estimated seniors, counted together for each outcome group.
export interface Count {
  blocks: number;
  seniors: number;
}

export interface Summary {
  groups: Record<Group, Count>;
  noOneCanWalk: Count; // sub-line of cut off
  nowWorse: Count; // sub-count of already without
}

export function summarise(outcomes: readonly BlockOutcome[]): Summary {
  const zero = (): Count => ({ blocks: 0, seniors: 0 });
  const s: Summary = {
    groups: { 'cut-off': zero(), 'already-without': zero(), unaffected: zero() },
    noOneCanWalk: zero(),
    nowWorse: zero(),
  };
  const add = (count: Count, seniors: number) => {
    count.blocks += 1;
    count.seniors += seniors;
  };
  for (const o of outcomes) {
    add(s.groups[o.group], o.block.est_seniors);
    if (o.noOneCanWalk) add(s.noOneCanWalk, o.block.est_seniors);
    if (o.nowWorse) add(s.nowWorse, o.block.est_seniors);
  }
  return s;
}

export interface AreaCutOff {
  subzone_id: string;
  seniors: number;
  blocks: number;
}

// Subzones with seniors cut off, most first: the areas whose AAC should check in.
export function areasCutOff(outcomes: readonly BlockOutcome[]): AreaCutOff[] {
  const bySubzone = new Map<string, AreaCutOff>();
  for (const o of outcomes) {
    if (o.group !== 'cut-off') continue;
    const id = o.block.subzone_id;
    const area = bySubzone.get(id) ?? { subzone_id: id, seniors: 0, blocks: 0 };
    area.seniors += o.block.est_seniors;
    area.blocks += 1;
    bySubzone.set(id, area);
  }
  return [...bySubzone.values()].sort((a, b) => b.seniors - a.seniors);
}

// Seniors per block are estimates, so counts are shown to the nearest 5.
export function roughCount(n: number): string {
  if (n < 5) return n > 0 ? '<5' : '0';
  return (Math.round(n / 5) * 5).toLocaleString('en-US');
}
