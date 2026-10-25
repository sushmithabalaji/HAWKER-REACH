import { describe, expect, test } from 'vitest';
import { multiplierBand, multiplierBandLabel, toSubzoneSeniors } from './subzoneSeniors';

describe('multiplierBand', () => {
  test('four bands, each including its lower break', () => {
    expect([0.3, 0.85, 0.9, 1.1, 1.34, 1.35, 2].map(multiplierBand)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  test('small subzones have no band', () => {
    expect(multiplierBand(null)).toBeNull();
  });

  test('labels', () => {
    expect([0, 1, 3].map(multiplierBandLabel)).toEqual(['under ×0.85', '×0.85–1.1', '×1.35+']);
  });
});

test('toSubzoneSeniors keeps nulls for small subzones', () => {
  const s = toSubzoneSeniors({ subzone_id: 'X', pct_65p: null, multiplier: '', is_super_aged: 'false' });
  expect(s).toMatchObject({ pct_65p: null, multiplier: null, is_super_aged: false });
});
