-- Shell check: proves the app can read a gold table through the warehouse.
-- DISTINCT because block_access v1 has one row per block per time limit.
SELECT COUNT(DISTINCT block_id) AS blocks
FROM hawkerreach.gold.block_access;
