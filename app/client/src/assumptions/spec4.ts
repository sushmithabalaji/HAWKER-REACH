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
    text: 'Centres to close in the same window: any open centre that gets a green verdict if added to the plan, is not possibly under-counted, and has no renovation, redevelopment or partial closure in the window. Due for Repairs and Redecoration (R&R) first (none on record, or the last one a full cycle ago), then fewest seniors cut off and then fewest diners displaced if it closes on its own, up to 5. R&R history starts with the closure records (2024), so older works are unknown (#73)',
    tag: 'MODELLED',
    source: 'gold.centres · gold.centre_closures · gold.centre_demand · gold.block_options, evaluated in the page',
    status: 'decided',
  },
  {
    text: 'Closure window: one shared from–to date range, prefilled from the anchor’s next scheduled renovation or redevelopment and editable. With no dates, overlap is not checked',
    tag: 'ASSUMPTION',
    source: 'Spec 4 design decision; gold.centre_closures (NEA schedule)',
    status: 'decided',
  },
  {
    text: 'Last R&R: the end of the latest finished renovation closure whose remarks say Repairs and Redecoration (or the Hawker Centres Transformation Programme)',
    tag: 'MEASURED',
    source: 'gold.centre_closures (NEA Dates of Hawker Centres Closure, data.gov.sg)',
    status: 'sourced',
  },
  { key: 'candidates.rr_cycle_years' },
  {
    text: 'Seniors cut off (centres to close in the same window): seniors in blocks left with no centre within 15 min at senior pace if that centre closes on its own',
    tag: 'MODELLED',
    source: 'gold.block_options (walk_m at 1.0 m/s), evaluated in the page',
    status: 'decided',
  },
  {
    text: "Diners displaced a day (centres to close in the same window): the centre's modelled diners today, who would all eat elsewhere while it is closed",
    tag: 'MODELLED',
    source: 'gold.centre_demand',
    status: 'decided',
  },
  {
    limitation:
      "R&R history only goes back as far as NEA's closures file (2024), so a centre with no R&R on record may have had one before then (#73)",
  },
];
