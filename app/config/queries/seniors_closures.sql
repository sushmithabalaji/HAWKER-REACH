-- Current and upcoming renovation and redevelopment closures, which can be picked and count as closed when
-- they overlap. Cleaning (counted as open), partial (gas) and past closures are left out (ASSUMPTIONS.md).
SELECT k.closure_id, k.centre_id, c.name, c.pln_area_n, k.type,
  CAST(k.start_date AS STRING) AS start_date, CAST(k.end_date AS STRING) AS end_date, k.duration_days, k.remarks
FROM hawkerreach.gold.centre_closures k
JOIN hawkerreach.gold.centres c USING (centre_id)
WHERE k.type IN ('renovation', 'redevelopment') AND k.end_date >= current_date()
ORDER BY k.start_date, c.name;
