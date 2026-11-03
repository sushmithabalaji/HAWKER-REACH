-- The data date for the "Ask HawkerReach" chat footer (Spec 6, #129): when the rebuild job last wrote gold
-- (08_gold_assumptions writes built_at on every row).
SELECT max(built_at) AS built_at
FROM hawkerreach.gold.model_assumptions;
