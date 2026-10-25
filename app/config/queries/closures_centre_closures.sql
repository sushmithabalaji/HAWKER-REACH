-- Every closure type and date. The verdict cards' overlap note takes only renovation and redevelopment
-- (the engine filters; cleaning is not shown there, #11), and the Schedule alongside tab also needs
-- partial closures and cleaning days (#60).
SELECT closure_id, centre_id, type,
  CAST(start_date AS STRING) AS start_date, CAST(end_date AS STRING) AS end_date, duration_days, remarks
FROM hawkerreach.gold.centre_closures;
