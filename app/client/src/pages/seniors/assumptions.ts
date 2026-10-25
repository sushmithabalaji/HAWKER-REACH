import type { AssumptionLine } from '@shared/assumptions';
import { CUTOFF_M, SUPER_AGED_PCT } from './settings';
import { SUPPORT_RULES, SUPPORTS } from './support';

export const seniorsAssumptions: AssumptionLine[] = [
  { key: 'walk.pace.senior' },
  { key: 'walk.pace.typical' },
  { key: 'walk.pace.brisk' },
  { key: 'walk.limit_min' },
  { key: 'walk.cutoff_m' },
  {
    text: 'Tiers at 15 min: T1 up to 900 m (a senior can walk it), T2 up to 1,080 m (a typical walker only), T3 up to 1,260 m (a brisk walker only), T4 further or no centre within 2 km (no one can walk it)',
    tag: 'MODELLED',
    source: 'Walks to the three nearest centres in gold.block_access (04_gold_access, tiers.py)',
    status: 'decided',
  },
  {
    text: 'Seniors per block: the subzone’s HDB residents aged 65+, spread over its blocks by flat type',
    tag: 'MODELLED',
    source: 'silver.blocks.est_seniors (02_silver), from SingStat HDB residents by age and subzone',
    status: 'decided',
  },
  {
    text: 'Closure dates: current and upcoming renovation and redevelopment closures can be picked',
    tag: 'MEASURED',
    source: 'NEA hawker centre closure schedule (gold.centre_closures)',
    status: 'sourced',
  },
  {
    text: 'Outcome groups, for blocks whose nearest centre closes: cut off (T1 → T2–T4; no one can walk it is T1 → T4), already without access (T2–T4 before; now worse is T2/T3 → T4), unaffected (T1 → T1)',
    tag: 'MODELLED',
    source: 'ASSUMPTIONS.md (outcome groups), matching gold.access_sensitivity',
    status: 'decided',
  },
  {
    text: 'Areas where the AAC should check in: subzones with at least one senior cut off by the closure',
    tag: 'MODELLED',
    source: 'ASSUMPTIONS.md (Areas to alert)',
    status: 'decided',
  },
  {
    text: `Priority areas, shown first and outlined on the map: areas to alert with a block where no one can walk to a centre (T1 → T4), or where ${SUPER_AGED_PCT}%+ of HDB residents are 65+. The rest are behind "Show all"; the order stays by seniors cut off`,
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, priority areas)',
    status: 'decided',
  },
  {
    text: 'Suggested support: every area gets its alternative centre, the next open centre for its furthest block',
    tag: 'MODELLED',
    source: 'gold.block_access (second and third nearest centres)',
    status: 'decided',
  },
  ...SUPPORTS.map(
    (support): AssumptionLine => ({
      text: `${support}: when ${SUPPORT_RULES[support]}`,
      tag: 'ASSUMPTION',
      source: 'Team decision (ASSUMPTIONS.md, suggested support, #78)',
      status: 'decided',
    })
  ),
  { key: 'access.food_point_min_seniors' },
  {
    limitation:
      'Community meal points are not suggested yet: there is no data on where they are. A crowding check on the alternative centre is a follow-up',
  },
  {
    text: 'Meal-support list and Areas to alert: blocks whose seniors are cut off (T1 → T2–T4) by the closure',
    tag: 'MODELLED',
    source: 'ASSUMPTIONS.md (outcome groups)',
    status: 'decided',
  },
  {
    text: `Walk distances: the shortest route along the OpenStreetMap walking network from each block to its three nearest centres within ${CUTOFF_M / 1000} km`,
    tag: 'MODELLED',
    source: 'silver.dist_matrix (03_dist_matrix), OpenStreetMap',
    status: 'decided',
  },
  {
    text: 'Share aged 65+: a subzone’s HDB residents aged 65+ ÷ its HDB residents',
    tag: 'MEASURED',
    source: 'SingStat HDB residents by age and subzone (gold.subzone_seniors)',
    status: 'sourced',
  },
  { key: 'access.sensitivity_limits_min' },
  { key: 'access.super_aged_share' },
  { key: 'access.min_subzone_residents' },
  {
    text: 'Vulnerability multiplier: a subzone’s share aged 65+ ÷ the HDB-wide share aged 65+. Shown on its own map view and never combined into a score',
    tag: 'MODELLED',
    source: 'gold.subzone_seniors (04_gold_access)',
    status: 'decided',
  },
  {
    limitation:
      'Our share aged 65+ counts SingStat HDB residents; the official 21% super-aged figure counts citizens, so the two are close but not the same',
  },
  {
    text: 'Seniors counts are shown to the nearest 5, and under 5 as "<5", because seniors per block are estimates',
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, display rounding)',
    status: 'decided',
  },
  {
    limitation:
      'A picked NEA closure also treats renovation or redevelopment at other centres during the same dates as closed; cleaning at a neighbour (a few days) is a note only',
  },
  {
    limitation:
      'The 10 and 20 min figures are for the picked centre closing alone, so they leave out other closures at the same time',
  },
  {
    limitation: 'Subzone outlines on the map are simplified to about 15 m, so borders are approximate at street level',
  },
];
