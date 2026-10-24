import type { AssumptionLine } from '@shared/assumptions';

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
    limitation:
      'A picked NEA closure also treats renovation or redevelopment at other centres during the same dates as closed; cleaning at a neighbour (a few days) is a note only',
  },
  {
    limitation:
      'The 10 and 20 min figures are for the picked centre closing alone, so they leave out other closures at the same time',
  },
  { limitation: 'Seniors counts are estimates, shown to the nearest 5' },
  {
    limitation: 'Subzone outlines on the map are simplified to about 15 m, so borders are approximate at street level',
  },
];
