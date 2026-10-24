import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { assumptions } from '@shared/assumptions';
import { checkScenarios, type ClosureScenarioRow } from '@shared/closure-engine';
import { toNumber, toNumberOrNull, toText, type RawRow, type RawValue } from '@/components/shared/queryValues';
import { toGoldData } from './goldRows';

// #18: the engine against Spec 2's gold.closure_scenarios, on live gold. Needs the Databricks CLI signed
// in and a warehouse, so it runs only through `npm run check:scenarios`, never in `npm test`.
const WAREHOUSE = process.env.DATABRICKS_WAREHOUSE_ID;
const RUN = process.env.CHECK_GOLD === '1';

// The parts of the SQL Statement Execution API's reply that the check reads.
interface Chunk {
  data_array?: RawValue[][];
  next_chunk_internal_link?: string;
}
interface StatementReply {
  status?: { state: string };
  manifest: { schema: { columns: { name: string }[] } };
  result: Chunk;
}

function query(statement: string): RawRow[] {
  const run = <T>(args: string[]) =>
    JSON.parse(execFileSync('databricks', args, { encoding: 'utf8', maxBuffer: 1 << 28 })) as T;
  const body = { warehouse_id: WAREHOUSE, statement, wait_timeout: '50s', format: 'JSON_ARRAY', disposition: 'INLINE' };
  const first = run<StatementReply>(['api', 'post', '/api/2.0/sql/statements', '--json', JSON.stringify(body)]);
  if (first.status?.state !== 'SUCCEEDED') throw new Error(`Query failed: ${JSON.stringify(first.status)}`);
  const columns = first.manifest.schema.columns.map((c) => c.name);
  const rows = [...(first.result.data_array ?? [])];
  for (let next = first.result.next_chunk_internal_link; next; ) {
    const chunk = run<Chunk>(['api', 'get', next]);
    rows.push(...(chunk.data_array ?? []));
    next = chunk.next_chunk_internal_link;
  }
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
}

// Page 1's own query files, so the check reads exactly what the page reads.
const pageQuery = (name: string) =>
  query(readFileSync(path.resolve(__dirname, `../../../../config/queries/closures_${name}.sql`), 'utf8'));

function toScenario(r: RawRow): ClosureScenarioRow {
  return {
    centre_id: toText(r.centre_id),
    worst_neighbour_id: r.worst_neighbour_id === null ? null : toText(r.worst_neighbour_id),
    worst_neighbour_extra_per_stall: toNumberOrNull(r.worst_neighbour_extra_per_stall),
    worst_neighbour_pct: toNumberOrNull(r.worst_neighbour_pct),
    unserved_residents: toNumber(r.unserved_residents),
    seniors_lost_walk: toNumber(r.seniors_lost_walk),
  };
}

describe.runIf(RUN)('engine vs gold.closure_scenarios', () => {
  test('every single closure matches within 0.01', { timeout: 300_000 }, () => {
    if (!WAREHOUSE) throw new Error('Set DATABRICKS_WAREHOUSE_ID');
    const data = toGoldData({
      blockOptions: pageQuery('block_options'),
      centres: pageQuery('centres'),
      centreDemand: pageQuery('centre_demand'),
      centreClosures: pageQuery('centre_closures'),
    });
    const scenarios = query(
      'SELECT centre_id, worst_neighbour_id, worst_neighbour_extra_per_stall, worst_neighbour_pct, unserved_residents, seniors_lost_walk FROM hawkerreach.gold.closure_scenarios'
    ).map(toScenario);

    const mismatches = checkScenarios(data, scenarios, assumptions);
    console.log(`Checked ${scenarios.length} single closures: ${mismatches.length} mismatched fields`);
    for (const m of mismatches) console.log(`${m.centreId} ${m.field}: engine ${m.engine}, gold ${m.gold}`);

    expect(scenarios.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });
});
