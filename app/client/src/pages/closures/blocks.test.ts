import { describe, expect, test } from 'vitest';
import type { BlockOptionRow } from '@shared/closure-engine';
import { blockPoints } from './blocks';

const row = (block_id: string, rank: number): BlockOptionRow => ({
  block_id,
  centre_id: `C${rank}`,
  walk_m: 100 * rank,
  rank,
  lon: 103.8,
  lat: 1.35,
  subzone_id: 'SZ',
  est_residents: 420,
  est_seniors: 60,
  diners_per_day: 150,
});

describe('blockPoints', () => {
  test('one point per block, however many centre rows it has', () => {
    const points = blockPoints([row('B1', 1), row('B1', 2), row('B2', 1)]);
    expect([...points.keys()]).toEqual(['B1', 'B2']);
    expect(points.get('B1')).toEqual({ blockId: 'B1', lon: 103.8, lat: 1.35, residents: 420, label: null });
  });

  test("names a block from gold.block_access's labels when it has one", () => {
    const points = blockPoints([row('B1', 1), row('B2', 1)], new Map([['B1', '406 FAJAR RD']]));
    expect(points.get('B1')?.label).toBe('406 FAJAR RD');
    expect(points.get('B2')?.label).toBeNull();
  });
});
