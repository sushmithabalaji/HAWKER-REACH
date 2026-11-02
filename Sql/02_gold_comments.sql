-- Table and column comments for the seven gold tables the "Ask HawkerReach" Genie space reads (#126).
-- Genie reads these from Unity Catalog. The gold notebooks overwrite their tables on every rebuild,
-- which drops comments, so 08_gold_assumptions re-applies this file as the job's last gold step.
-- One statement per ";" at a line end: keep semicolons out of the comment text. Every COMMENT ON TABLE here is
-- a table 08 checks for full column comments.
-- Values quoted here (0.83, 3 visits, 900 m, 0.21 ...) mirror assumptions.json: update both together.

COMMENT ON TABLE hawkerreach.gold.centres IS
  'One row per operating NEA hawker centre (data.gov.sg). Interim centres take diners but are never closed in the model.';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN centre_id COMMENT 'Centre key, e.g. HC_119477. Joins to centre_id / closed_centre_id / worst_neighbour_id in the other gold tables.';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN name COMMENT 'Hawker centre name as NEA publishes it, e.g. Kim Keat Palm Market & Food Centre.';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN lon COMMENT 'Longitude (WGS84).';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN lat COMMENT 'Latitude (WGS84).';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN cooked_food_stalls COMMENT 'Number of cooked food stalls (MEASURED, NEA).';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN is_interim COMMENT 'True for an interim centre. Interim centres are never closed in the model and have no closure scenario.';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN pln_area_n COMMENT 'URA planning area name in capitals, e.g. TOA PAYOH.';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN subzone_id COMMENT 'URA subzone code the centre sits in. Joins to subzone_seniors.subzone_id.';
ALTER TABLE hawkerreach.gold.centres ALTER COLUMN opening_year COMMENT 'Year the centre was first completed. Null when NEA gives no year.';

COMMENT ON TABLE hawkerreach.gold.centre_closures IS
  'One row per NEA closure event (data.gov.sg dates of hawker centre closure). Works closures are types renovation, redevelopment and partial. Cleaning is routine and never counts as a closure.';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN closure_id COMMENT 'Closure key (hash of centre, type and start date).';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN centre_id COMMENT 'Centre that closes. Joins to centres.centre_id.';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN type COMMENT 'cleaning (routine, not a closure), renovation, redevelopment or partial (e.g. gas works). Works closures = renovation, redevelopment, partial.';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN start_date COMMENT 'First day closed.';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN end_date COMMENT 'Last day closed.';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN duration_days COMMENT 'Days closed, counting both start and end date.';
ALTER TABLE hawkerreach.gold.centre_closures ALTER COLUMN remarks COMMENT 'NEA free-text remarks for the closure.';

COMMENT ON TABLE hawkerreach.gold.closure_scenarios IS
  'One row per closable (non-interim) centre: what happens if that centre closes alone. Each HDB block whose nearest centre closes moves, all or nothing, to its second-nearest centre within 2 km. All counts are MODELLED estimates. Only seniors_lost_walk uses the 15-minute senior walk (900 m at 1.0 m/s): the other counts have no time limit.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN centre_id COMMENT 'Centre that closes. Joins to centres.centre_id.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN residents_displaced COMMENT 'Estimated residents whose nearest centre this is (MODELLED). Round to the nearest 10.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN seniors_displaced COMMENT 'Estimated residents aged 65+ whose nearest centre this is (MODELLED). Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN unserved_residents COMMENT 'Estimated displaced residents with no other centre within 2 km (MODELLED). Round to the nearest 10.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN seniors_lost_walk COMMENT 'Seniors cut off: estimated seniors who could walk to a centre within 15 min before the closure and cannot after it (MODELLED). Equals access_sensitivity.seniors_cut_off at limit_min = 15. Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN worst_neighbour_id COMMENT 'Neighbouring centre that takes the most extra diners per stall. Joins to centres.centre_id. Null when nobody moves.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN worst_neighbour_extra_per_stall COMMENT 'Extra diners a day per cooked food stall at the worst neighbour (MODELLED). Null when that centre has no stalls. Round to a whole number.';
ALTER TABLE hawkerreach.gold.closure_scenarios ALTER COLUMN worst_neighbour_pct COMMENT 'How much busier the worst neighbour gets, in percent of its own residents today (69.8 means 69.8% busier). Null when it has no residents today. Round to a whole percent.';

COMMENT ON TABLE hawkerreach.gold.access_sensitivity IS
  'One row per closable centre and walking-time limit (10, 15 or 20 min): seniors whose walk changes if that centre closes alone. Tiers by walk to the nearest open centre within the limit: T1 a senior (1.0 m/s) can walk it, T2 only a typical walker (1.2 m/s), T3 only a brisk walker (1.4 m/s), T4 no one, or no centre within 2 km. At 15 min: T1 <= 900 m, T2 <= 1080 m, T3 <= 1260 m. The default limit is 15. All counts are MODELLED estimates.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN closed_centre_id COMMENT 'Centre that closes. Joins to centres.centre_id.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN limit_min COMMENT 'Walking-time limit in minutes: 10, 15 (default) or 20.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN seniors_cut_off COMMENT 'Seniors cut off: T1 before the closure, T2-T4 after. Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN seniors_no_one_can_walk COMMENT 'Seniors for whom no one can walk it: T1 before, T4 after. A subset of seniors_cut_off. Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN seniors_already_without COMMENT 'Seniors whose nearest centre this is but who were already beyond the limit before it closed (T2-T4 before). Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN seniors_now_worse COMMENT 'Seniors already beyond the limit (T2 or T3) who fall to T4 after the closure. Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.access_sensitivity ALTER COLUMN blocks_cut_off COMMENT 'HDB blocks whose seniors are cut off (T1 before, T2-T4 after).';

COMMENT ON TABLE hawkerreach.gold.centre_demand IS
  'One row per centre: modelled demand today. Diners a day = residents whose nearest centre it is x 0.83 (NEA Perception Survey 2018) x 3 visits a week / 7. Diners means hawker visits a day, not unique people. Rankings and percentages hold across 1-5 visits a week, absolute counts do not.';
ALTER TABLE hawkerreach.gold.centre_demand ALTER COLUMN centre_id COMMENT 'Centre key. Joins to centres.centre_id.';
ALTER TABLE hawkerreach.gold.centre_demand ALTER COLUMN baseline_residents COMMENT 'Estimated residents whose nearest centre this is (MODELLED). Round to the nearest 10.';
ALTER TABLE hawkerreach.gold.centre_demand ALTER COLUMN baseline_diners_per_day COMMENT 'Estimated hawker visits a day at this centre (MODELLED, ASSUMPTION 3 visits a week). Round to the nearest 10.';
ALTER TABLE hawkerreach.gold.centre_demand ALTER COLUMN residents_per_stall COMMENT 'baseline_residents / cooked_food_stalls. Round to a whole number.';
ALTER TABLE hawkerreach.gold.centre_demand ALTER COLUMN possibly_undercounted COMMENT 'True when residents_per_stall is below 0.1 x the median across centres. The model only counts HDB residents, so centres serving offices, tourists or private housing (CBD, Chinatown, East Coast) look quieter than they are.';

COMMENT ON TABLE hawkerreach.gold.subzone_seniors IS
  'One row per URA subzone with HDB residents: SingStat HDB residents (citizens and PRs) and the share aged 65+ (MEASURED). Subzones with no HDB residents have no row.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN subzone_id COMMENT 'URA subzone code. Joins to centres.subzone_id.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN subzone_name COMMENT 'URA subzone name in capitals.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN pln_area_n COMMENT 'URA planning area name in capitals, e.g. TOA PAYOH.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN hdb_residents COMMENT 'HDB residents in the subzone (SingStat, MEASURED). Round to the nearest 10.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN hdb_seniors COMMENT 'HDB residents aged 65+ in the subzone (SingStat, MEASURED). Round to the nearest 5, below 5 as <5.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN pct_65p COMMENT 'Share of HDB residents aged 65+, as a fraction from 0 to 1 (0.249 = 24.9%). Show as a whole percent. Null for subzones under 50 residents.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN multiplier COMMENT 'pct_65p divided by the national HDB share aged 65+ (1.2 = 20% above the national share). Null for subzones under 50 residents.';
ALTER TABLE hawkerreach.gold.subzone_seniors ALTER COLUMN is_super_aged COMMENT 'True when pct_65p >= 0.21 (MOH definition of super-aged). Null for subzones under 50 residents.';

COMMENT ON TABLE hawkerreach.gold.model_assumptions IS
  'One row per model assumption, copied from assumptions.json at the repo root (the same file the app reads). Use it to answer what the model assumes and where each value comes from.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN key COMMENT 'Assumption key, e.g. walk.pace.senior, walk.limit_min, diners.eating_share.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN name COMMENT 'Plain-English name of the assumption.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN value COMMENT 'Value as text (cast to a number where needed). A list such as 10, 20 stays text.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN unit COMMENT 'Unit of value, e.g. m/s, min, share.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN tag COMMENT 'MEASURED, MODELLED or ASSUMPTION, as on the app''s Assumptions panel.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN status COMMENT 'sourced (outside source or data check), open (still needs a source) or decided (a team or design choice).';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN source COMMENT 'Where the value comes from.';
ALTER TABLE hawkerreach.gold.model_assumptions ALTER COLUMN built_at COMMENT 'When the rebuild job last wrote the gold tables (UTC). The data date for every answer.';
