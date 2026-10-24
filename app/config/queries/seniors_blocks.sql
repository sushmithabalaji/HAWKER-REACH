-- Every HDB block with its three nearest centres, for Page 2's closure scenarios.
-- The page works out each block's tier after a closure from these walks (ASSUMPTIONS.md, access model).
SELECT block_id, block_label, subzone_id, pln_area_n, lon, lat, est_seniors, tier_now,
  nearest_centre_id, nearest_walk_m, second_centre_id, second_walk_m, third_centre_id, third_walk_m
FROM hawkerreach.gold.block_access;
