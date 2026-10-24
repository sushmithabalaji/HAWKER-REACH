import type { AssumptionLine } from '@shared/assumptions';

// Page 1's Assumptions panel (#11, Assumptions panel lines). The benchmark's values today join
// the panel with the verdict cards.
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
    text: 'Newly unserved: residents with no open centre within 2 km because of the plan. Residents already without one before any closure are not counted',
    tag: 'MODELLED',
    source: 'gold.block_options',
    status: 'decided',
  },
  {
    text: 'Diners and residents are shown to the nearest 10 (≈), and extra diners per stall to one decimal place, because they are modelled',
    tag: 'ASSUMPTION',
    source: 'Team decision (Spec 3, display rounding)',
    status: 'decided',
  },
  { key: 'verdict.access.min_new_blocks' },
  { key: 'verdict.load.yellow_quantile' },
  { key: 'verdict.load.red_quantile' },
  { key: 'actions.waste.extra_per_stall_share' },
  { key: 'actions.waste.typical_centre_quantile' },
  { key: 'undercount_factor' },
  { key: 'plan.max_extra_centres' },
  { limitation: 'HDB residents only: workers, visitors and private-housing residents are not modelled' },
  { limitation: 'A whole block moves to its next-nearest centre together, a worst case for neighbours' },
  { limitation: 'Every displaced diner goes to another hawker centre, which overstates the load on neighbours' },
  {
    limitation: 'Diners go to their nearest centre only; spreading them over several centres (a Huff model) is Phase 2',
  },
  {
    limitation:
      'Possibly under-counted can also flag a centre in a tight cluster, whose residents are shared with its neighbours',
  },
];
