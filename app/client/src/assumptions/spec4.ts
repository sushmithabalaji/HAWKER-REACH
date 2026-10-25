import type { AssumptionLine } from '@shared/assumptions';

// Spec 4's lines (#61): extra waste per centre and the centres to schedule alongside. Page 1 spreads them into its panel.
export const spec4Assumptions: AssumptionLine[] = [
  { key: 'waste.kg_per_diner_per_day.low' },
  { key: 'waste.kg_per_diner_per_day.base' },
  { key: 'waste.kg_per_diner_per_day.high' },
  {
    text: 'Extra waste: extra diners per day × kg of food waste per diner per day. Per-centre rows use the base case. The plan total shows a range that combines the low and high kg with 1–5 visits a week',
    tag: 'ASSUMPTION',
    source: 'Spec 4 model rule (assumptions.json waste.kg_per_diner_per_day.*, diners.visits_per_week.*)',
    status: 'decided',
  },
  {
    text: 'NEA actions flag: a centre is flagged when its extra diners are more than the flag share of the diners it has today (a centre with almost none today counts as flagged). The same rule sets the NEA actions line on the verdict cards',
    tag: 'ASSUMPTION',
    source: 'assumptions.json actions.waste.flag_pct; wireframe v1 (+20% waste flag); gold.centre_demand',
    status: 'open',
  },
  {
    text: 'Centres to schedule alongside: open centres within 2 km of the anchor, as the crow flies, that would get a green verdict if added to the plan, with no renovation, redevelopment or partial closure overlapping the closure window. Cleaning overlaps are a note only. Oldest first, then nearest, up to 5; yellow centres fill any gaps, red centres are never shown',
    tag: 'MODELLED',
    source: 'gold.centres · gold.centre_closures · gold.block_options, evaluated in the page',
    status: 'decided',
  },
  {
    text: 'Closure window: one shared from–to date range, prefilled from the anchor’s next scheduled renovation or redevelopment and editable. With no dates, overlap is not checked',
    tag: 'ASSUMPTION',
    source: 'Spec 4 design decision; gold.centre_closures (NEA schedule)',
    status: 'decided',
  },
  {
    text: 'Centre age: the year the centre opened, shown as "Opened YYYY (N years ago)"',
    tag: 'MEASURED',
    source: 'gold.centres.opening_year (silver.centres, from NEA)',
    status: 'sourced',
  },
  {
    limitation:
      'Age is a proxy for maintenance need, not time since the last major works: the NEA closures file has no works history, so a recently renovated old centre looks older than its works record',
  },
];
