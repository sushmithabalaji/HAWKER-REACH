-- Map check: every HDB block as a point, to prove BaseMap draws about 10k points smoothly.
SELECT block_id, lon, lat
FROM hawkerreach.gold.block_access;
