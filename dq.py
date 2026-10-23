"""Append rows to data_quality_log, the one table every notebook writes (CLAUDE.md, team rules, from #23).

Issue rows record one problem (an unmatched name, a centre with no subzone).
Step rows record rows in, rows out and rows dropped for one step.
"""
import datetime

SCHEMA = ("run_at timestamp, notebook string, check_name string, entity_key string, detail string, "
          "rows_in bigint, rows_out bigint, dropped bigint")


class DQLog:
    def __init__(self, spark, notebook, schema="hawkerreach.silver"):
        # schema: hawkerreach.dev_<name> for test runs
        self.spark, self.table, self.notebook = spark, f"{schema}.data_quality_log", notebook
        self.run_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    def issues(self, check_name, items):
        """items: iterable of (entity_key, detail). Returns how many were logged."""
        rows = [(self.run_at, self.notebook, check_name, str(k), str(d), None, None, None) for k, d in items]
        self._append(rows)
        return len(rows)

    def step(self, check_name, rows_in, rows_out, detail=""):
        rows_in, rows_out = int(rows_in), int(rows_out)
        self._append([(self.run_at, self.notebook, check_name, None, detail, rows_in, rows_out, rows_in - rows_out)])
        print(f"{check_name}: in {rows_in} | out {rows_out} | dropped {rows_in - rows_out}")

    def _append(self, rows):
        if rows:
            self.spark.createDataFrame(rows, schema=SCHEMA).write.mode("append").saveAsTable(self.table)
