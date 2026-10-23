-- Shell check: proves the app can read a gold table through the warehouse.
SELECT COUNT(DISTINCT block_id) AS blocks
FROM hawkerreach.gold.block_access;
