-- One row per HDB block × centre within 2 km, nearest first, for Page 1's closure plan engine.
-- A block with no centre within 2 km has one row with a null centre_id (Spec 2, 05_gold_closures).
SELECT block_id, centre_id, walk_m, rank, lon, lat, subzone_id, est_residents, est_seniors, diners_per_day
FROM hawkerreach.gold.block_options;
