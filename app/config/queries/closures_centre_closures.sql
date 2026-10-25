-- Renovation and redevelopment closures, for the overlap note on verdict cards. Cleaning is not shown (#11).
SELECT closure_id, centre_id, type,
  CAST(start_date AS STRING) AS start_date, CAST(end_date AS STRING) AS end_date, duration_days, remarks
FROM hawkerreach.gold.centre_closures
WHERE type IN ('renovation', 'redevelopment');
