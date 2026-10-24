import type { AssumptionLine } from '@shared/assumptions';
import { CUTOFF_M, MEAL_SUPPORT_WALK_M, MEAL_SUPPORT_WALK_MIN, PACES } from './settings';

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
  { key: 'access.meal_support_walk_min' },
  {
    text: `Suggested support: walking buddy if the nearest open centre after the closure is within ${MEAL_SUPPORT_WALK_M.toLocaleString('en-US')} m (${MEAL_SUPPORT_WALK_MIN} min at ${PACES[0]} m/s); meal delivery if further or none within ${CUTOFF_M / 1000} km. A subzone takes the stricter suggestion of its blocks`,
    tag: 'ASSUMPTION',
    source: 'Team decision (ASSUMPTIONS.md, meal-support rule)',
    status: 'decided',
  },
  {
    text: 'Meal-support list and Areas to alert: blocks whose seniors are cut off (T1 → T2–T4) by the closure',
    tag: 'MODELLED',
    source: 'ASSUMPTIONS.md (outcome groups)',
    status: 'decided',
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
