import type { AssumptionLine } from '@shared/assumptions';

// Spec 2's model lines, shown on Page 1 (Spec 3). Page 1's registry entry spreads these into its `assumptions`.
export const spec2Assumptions: AssumptionLine[] = [
  {
    text: 'Diners move all-or-nothing to their next-nearest centre, a worst case for neighbours',
    tag: 'ASSUMPTION',
    source: 'gold.closure_scenarios, built in 05_gold_closures',
    status: 'decided',
  },
  {
    text: 'Everyone finds another hawker centre, which overstates the load on neighbours',
    tag: 'ASSUMPTION',
    source: 'gold.closure_scenarios, built in 05_gold_closures',
    status: 'decided',
  },
  {
    text: 'Residents are HDB residents only',
    tag: 'ASSUMPTION',
    source: 'silver.blocks est_residents, from HDB Property Information',
    status: 'decided',
  },
  {
    text: 'Possibly undercounted centres: fewer residents per stall than a set share of the median',
    tag: 'MODELLED',
    source: 'gold.centre_demand possibly_undercounted, threshold from assumptions.json undercount_factor',
    status: 'decided',
  },
  {
    text: 'Unserved count: residents whose nearest centre closes and who have no other centre within 2 km',
    tag: 'MODELLED',
    source: 'gold.closure_scenarios unserved_residents',
    status: 'decided',
  },
  {
    limitation:
      '6 centres get 0 modelled residents (Amoy Street, Market Street, Newton, Adam Road, East Coast Lagoon, Pasir Panjang), because their diners are workers, visitors and private-housing residents',
  },
];
