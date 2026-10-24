import { describe, expect, test } from 'vitest';
import type { BlockOptionRow } from '@shared/closure-engine';
import { blockBand, blockPoints } from './blocks';

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
    expect(points.get('B1')).toEqual({ blockId: 'B1', lon: 103.8, lat: 1.35, residents: 420 });
  });
});

describe('blockBand', () => {
  test("the wireframe's resident bands: under 250, 250–1,000, 1,000–2,500, 2,500+", () => {
    expect([0, 249, 250, 999, 1000, 2500, 9000].map((n) => blockBand(n).label)).toEqual([
      'under 250',
      'under 250',
      '250–1,000',
      '250–1,000',
      '1,000–2,500',
      '2,500+',
      '2,500+',
    ]);
  });
});
