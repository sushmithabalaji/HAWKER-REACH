import type { AssumptionLine } from '@shared/assumptions';
import { spec2Assumptions } from '../../assumptions/spec2';
import { spec4Assumptions } from '../../assumptions/spec4';

// Page 1's Assumptions panel (#11, Assumptions panel lines). The verdict rules and their constants are in
// assumptions.json and ASSUMPTIONS.md (#90).
export const closuresAssumptions: AssumptionLine[] = [
  {
    text: 'Diners per block per day: HDB residents × share who eat at hawker centres × visits per week ÷ 7, base case 3 visits a week, range 1–5. The survey covered adults aged 18–69 in 2018',
    tag: 'ASSUMPTION',
    source: 'NEA Perception Survey of Hawker Centre Patrons 2018; gold.block_options (05_gold_closures)',
    status: 'sourced',
  },
  { key: 'diners.eating_share' },
  { key: 'diners.visits_per_week.base' },
  { key: 'diners.visits_per_week.min' },
  { key: 'diners.visits_per_week.max' },
  { key: 'walk.pace.senior' },
  { key: 'walk.pace.typical' },
  { key: 'walk.pace.brisk' },
  { key: 'walk.limit_min' },
  { key: 'walk.cutoff_m' },
  {
    text: 'Where diners go: every block whose nearest centre closes moves all its diners to its nearest open centre by walking distance, ties broken by centre id',
    tag: 'MODELLED',
    source: 'gold.block_options (05_gold_closures), regrouped in the page',
    status: 'decided',
  },
  {
    text: 'Load: extra diners per day ÷ cooked food stalls. % over today’s modelled diners is shown for information only, and as "new" when a centre has none today',
    tag: 'MODELLED',
    source: 'gold.centres (stalls) · gold.centre_demand (baseline)',
    status: 'decided',
  },
  {
    text: 'Diners and residents are shown to the nearest 10 (≈), seniors to the nearest 5 (under 5 as "<5"), and extra diners per stall to one decimal place, because they are modelled',
    tag: 'ASSUMPTION',
    source: 'Team decision (Spec 3, display rounding)',
    status: 'decided',
  },
  {
    text: 'Concurrent closure check: an added centre is judged only on what happens because it closes together with the rest of the plan. Red or yellow comes from three things only: the share of the rest of the plan’s displaced diners that would move to it, blocks that lose a centre only when both close, and a third centre made much busier only when both close and not by either closure alone. What the centre does on its own is listed under its card and never sets its colour',
    tag: 'MODELLED',
    source: 'gold.block_options · gold.centres · gold.centre_demand, regrouped in the page',
    status: 'decided',
  },
  { key: 'verdict.share.red' },
  { key: 'verdict.share.yellow' },
  { key: 'verdict.access.min_new_blocks' },
  { key: 'verdict.load.red_pct' },
  { key: 'verdict.load.yellow_pct' },
  { key: 'actions.waste.flag_pct' },
  { key: 'undercount_factor' },
  { key: 'plan.max_extra_centres' },
  ...spec2Assumptions,
  ...spec4Assumptions,
  {
    limitation: 'Diners go to their nearest centre only; spreading them over several centres (a Huff model) is Phase 2',
  },
  {
    limitation:
      'Possibly under-counted can also flag a centre in a tight cluster, whose residents are shared with its neighbours',
  },
];
