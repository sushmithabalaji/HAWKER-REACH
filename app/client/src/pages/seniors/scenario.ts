import { assumptions } from '@shared/assumptions';
import { toNumber, toText, type RawRow, type RawValue } from '@/components/shared/queryValues';

export const TIERS = ['T1', 'T2', 'T3', 'T4'] as const;
export type Tier = (typeof TIERS)[number];

const value = (key: string) => Number(assumptions[key].value);
// Slowest first: the distance each covers in the limit is the top of T1, T2 and T3.
const PACES = [value('walk.pace.senior'), value('walk.pace.typical'), value('walk.pace.brisk')];
export const LIMIT_MIN = value('walk.limit_min');

// Same bands as tiers.py, which built tier_now in 04_gold_access.
export function tierOf(walkM: number | null, limitMin = LIMIT_MIN): Tier {
  if (walkM === null) return 'T4';
  const i = PACES.findIndex((pace) => walkM <= pace * limitMin * 60);
  return i === -1 ? 'T4' : TIERS[i];
}

// A row of gold.block_access (config/queries/seniors_blocks.sql), parsed by toAccessBlock.
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

// Missing centres arrive as null or "" depending on the format.
const isMissing = (v: RawValue | undefined) => v === undefined || v === null || v === '';

function toTier(v: RawValue): Tier {
  const t = toText(v);
  return (TIERS as readonly string[]).includes(t) ? (t as Tier) : 'T4';
}

export function toAccessBlock(row: RawRow): AccessBlock {
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
    lon: toNumber(row.lon ?? null),
    lat: toNumber(row.lat ?? null),
    est_seniors: isMissing(row.est_seniors) ? 0 : toNumber(row.est_seniors),
    tier_now: toTier(row.tier_now),
    options,
  };
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

export interface Summary {
  blocks: Record<Group, number>;
  seniors: Record<Group, number>;
  blocksNoOneCanWalk: number;
  seniorsNoOneCanWalk: number;
  blocksNowWorse: number;
  seniorsNowWorse: number;
}

export function summarise(outcomes: readonly BlockOutcome[]): Summary {
  const zero = () => ({ 'cut-off': 0, 'already-without': 0, unaffected: 0 });
  const s: Summary = {
    blocks: zero(),
    seniors: zero(),
    blocksNoOneCanWalk: 0,
    seniorsNoOneCanWalk: 0,
    blocksNowWorse: 0,
    seniorsNowWorse: 0,
  };
  for (const o of outcomes) {
    const seniors = o.block.est_seniors;
    s.blocks[o.group] += 1;
    s.seniors[o.group] += seniors;
    if (o.noOneCanWalk) {
      s.blocksNoOneCanWalk += 1;
      s.seniorsNoOneCanWalk += seniors;
    }
    if (o.nowWorse) {
      s.blocksNowWorse += 1;
      s.seniorsNowWorse += seniors;
    }
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
