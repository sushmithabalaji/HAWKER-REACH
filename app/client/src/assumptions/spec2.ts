import type { AssumptionLine } from '@shared/assumptions';

// Spec 2's lines (#21): the closure scenario model in 05_gold_closures. Page 1 spreads them into its panel.
export const spec2Assumptions: AssumptionLine[] = [
  {
    text: 'Diners move all-or-nothing: all of a block’s diners go to its next-nearest open centre, a worst case for neighbours',
    tag: 'ASSUMPTION',
    source: 'Spec 2 model rule (05_gold_closures, gold.block_options)',
    status: 'decided',
  },
  {
    text: 'Everyone finds another hawker centre: no displaced diner switches to a coffee shop, food court or home cooking, which overstates the load on neighbours',
    tag: 'ASSUMPTION',
    source: 'Spec 2 model rule (05_gold_closures)',
    status: 'decided',
  },
  {
    text: 'HDB residents only: workers, visitors and private-housing residents are not modelled',
    tag: 'ASSUMPTION',
    source: 'silver.blocks (HDB blocks only), used by 05_gold_closures',
    status: 'decided',
  },
  {
    text: 'Possibly under-counted: a centre whose modelled residents per stall are below a share of the median, so its real diners are likely more than the model counts',
    tag: 'MODELLED',
    source: 'gold.centre_demand.possibly_undercounted (05_gold_closures), using undercount_factor',
    status: 'decided',
  },
  {
    text: 'Newly unserved: residents with no open centre within 2 km because of the plan. Residents already without one before any closure are not counted',
    tag: 'MODELLED',
    source: 'gold.block_options · gold.closure_scenarios.unserved_residents (05_gold_closures)',
    status: 'decided',
  },
  {
    limitation:
      '6 centres get 0 modelled residents (Amoy Street, Market Street, Newton, Adam Road, East Coast Lagoon, Pasir Panjang), because their diners are workers, visitors and private-housing residents',
  },
];
