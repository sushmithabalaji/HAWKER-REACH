import type { AssumptionLine } from '@shared/assumptions';
import { CUTOFF_M, LIMIT_MIN, SEVERE_NO_WALK_SENIORS, SEVERE_PRIORITY_AREAS, SUPER_AGED_PCT } from './settings';
import { SUPPORT_RULES, SUPPORTS } from './support';

// Page 2's Assumptions panel: only what a reader needs to trust and act on the page (#91). Method notes
// for the team live in ASSUMPTIONS.md, not here.
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
    text: 'Map colours: OK is T1, Concerning is T2 and T3 together, Highly vulnerable is T4',
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, map legends)',
    status: 'decided',
  },
  {
    text: `Walks follow footpaths (OpenStreetMap) to the nearest open NEA hawker centre within ${CUTOFF_M / 1000} km`,
    tag: 'MODELLED',
    source: 'silver.dist_matrix (03_dist_matrix), OpenStreetMap',
    status: 'decided',
  },
  {
    text: 'Seniors per block are estimates from SingStat HDB residents aged 65+ in each subzone',
    tag: 'MODELLED',
    source: 'silver.blocks.est_seniors (02_silver), SingStat HDB residents by age and subzone',
    status: 'decided',
  },
  {
    text: 'Closure dates: current and upcoming renovation and redevelopment closures can be picked',
    tag: 'MEASURED',
    source: 'NEA hawker centre closure schedule (gold.centre_closures)',
    status: 'sourced',
  },
  {
    text: 'A picked closure also counts renovation or redevelopment at nearby centres in the same dates as closed ("Also closed then"); cleaning counts as open',
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, closures handled)',
    status: 'decided',
  },
  {
    text: `Seniors cut off: their walk to a centre was within ${LIMIT_MIN} min at a senior pace before the closure and isn’t after it.`,
    tag: 'MODELLED',
    source: 'ASSUMPTIONS.md (outcome groups: cut off)',
    status: 'decided',
  },
  {
    text: 'Access before → after: seniors in blocks whose nearest centre closed, by map level (OK, Concerning, Highly vulnerable) before and after the closure; blocks that keep their level are left out',
    tag: 'MODELLED',
    source: 'gold.block_access (tier_now, and the next open centre after the closure)',
    status: 'decided',
  },
  {
    text: `Priority areas: a block where no one can walk to a centre, or ${SUPER_AGED_PCT}%+ of HDB residents aged 65+`,
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, priority areas)',
    status: 'decided',
  },
  {
    text: `Severity: Severe at ${SEVERE_PRIORITY_AREAS}+ priority areas or ${SEVERE_NO_WALK_SENIORS}+ seniors no one can walk for, Moderate with any priority area, Low when seniors only have a longer walk`,
    tag: 'ASSUMPTION',
    source: 'Team proposal (ASSUMPTIONS.md, severity, #79)',
    status: 'open',
  },
  { key: 'access.severity.severe_priority_areas' },
  { key: 'access.severity.severe_no_walk_seniors' },
  {
    text: 'Alternative centre: the open centre nearest any of the area’s cut-off blocks',
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
    text: 'Share aged 65+: a subzone’s HDB residents aged 65+ ÷ its HDB residents',
    tag: 'MEASURED',
    source: 'SingStat HDB residents by age and subzone (gold.subzone_seniors)',
    status: 'sourced',
  },
  { key: 'access.super_aged_share' },
  {
    text: 'Vulnerability multiplier: a subzone’s share aged 65+ ÷ the HDB-wide share aged 65+',
    tag: 'MODELLED',
    source: 'gold.subzone_seniors (04_gold_access)',
    status: 'decided',
  },
  {
    text: 'Vulnerability bands: Low under ×0.85, Moderate ×0.85–1.1, High ×1.1–1.35, Extremely vulnerable ×1.35+',
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, map legends)',
    status: 'decided',
  },
  {
    text: 'Data: HDB property information and building outlines (data.gov.sg), NEA hawker centres and closure dates, URA Master Plan subzones, SingStat HDB residents by age and subzone',
    tag: 'MEASURED',
    source: 'data.gov.sg, NEA, URA, SingStat (via the hawkerreach gold tables)',
    status: 'sourced',
  },
  { limitation: 'Coffee shops and food courts are not counted: only NEA hawker centres' },
];
