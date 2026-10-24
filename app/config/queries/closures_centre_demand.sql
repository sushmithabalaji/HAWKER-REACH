-- Each centre's modelled diners today and the possibly under-counted flag (Spec 2, 05_gold_closures).
SELECT centre_id, baseline_residents, baseline_diners_per_day, residents_per_stall, possibly_undercounted
FROM hawkerreach.gold.centre_demand;
