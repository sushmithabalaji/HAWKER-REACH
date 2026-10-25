-- Every operating centre with its stalls, for the engine's load per stall. Interim centres are
-- included: they take diners but can't be closed in a plan.
SELECT centre_id, name, lon, lat, cooked_food_stalls, is_interim, pln_area_n, subzone_id, opening_year
FROM hawkerreach.gold.centres;
