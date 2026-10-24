-- Current and upcoming closures. Renovation and redevelopment can be picked; cleaning is shown as a note only.
-- Partial (gas) and past closures are left out (ASSUMPTIONS.md, what can be picked).
SELECT k.closure_id, k.centre_id, c.name, c.pln_area_n, k.type,
  CAST(k.start_date AS STRING) AS start_date, CAST(k.end_date AS STRING) AS end_date, k.duration_days, k.remarks
FROM hawkerreach.gold.centre_closures k
JOIN hawkerreach.gold.centres c USING (centre_id)
WHERE k.type IN ('renovation', 'redevelopment', 'cleaning') AND k.end_date >= current_date()
ORDER BY k.start_date, c.name;
