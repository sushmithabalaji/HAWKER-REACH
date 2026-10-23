
CREATE CATALOG IF NOT EXISTS hawkerreach;
CREATE SCHEMA IF NOT EXISTS hawkerreach.bronze;
CREATE SCHEMA IF NOT EXISTS hawkerreach.silver;
CREATE SCHEMA IF NOT EXISTS hawkerreach.gold;
CREATE VOLUME IF NOT EXISTS hawkerreach.bronze.raw_files;
-- The one table every notebook writes (append-only): issue rows and per-step row counts.
CREATE TABLE IF NOT EXISTS hawkerreach.silver.data_quality_log (
  run_at TIMESTAMP, notebook STRING, check_name STRING, entity_key STRING, detail STRING,
  rows_in BIGINT, rows_out BIGINT, dropped BIGINT
);
