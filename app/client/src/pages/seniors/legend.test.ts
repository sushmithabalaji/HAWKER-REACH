import { describe, expect, test } from 'vitest';
import { isShaded, MULTIPLIER_BANDS, tierHex } from './legend';
import { levelShifts, runScenario, type AccessBlock, type Tier } from './scenario';
import { MULTIPLIER_BREAKS } from './subzoneSeniors';

describe('map legends', () => {
  test('T2 and T3 share the concerning colour; T1 and T4 each have their own', () => {
    expect(tierHex('T2')).toBe(tierHex('T3'));
    expect(new Set([tierHex('T1'), tierHex('T2'), tierHex('T4')]).size).toBe(3);
  });

  test('one named vulnerability band per multiplier band', () => {
    expect(MULTIPLIER_BANDS).toHaveLength(MULTIPLIER_BREAKS.length + 1);
  });
});

// A block whose nearest centre is C, then D at the given walk (or no second centre).
const block = (block_id: string, tier_now: Tier, nextWalkM: number | null, est_seniors: number): AccessBlock => ({
  block_id,
  block_label: block_id,
  subzone_id: 'SZ1',
  pln_area_n: 'TOA PAYOH',
  lon: 103.85,
  lat: 1.33,
  est_seniors,
  tier_now,
  options: [{ centre_id: 'C', walk_m: 300 }, ...(nextWalkM === null ? [] : [{ centre_id: 'D', walk_m: nextWalkM }])],
});

describe('isShaded', () => {
  test('every subzone with no closure; only cut-off ones with a closure', () => {
    const cutOff = new Set(['HIT']);
    expect(isShaded('OTHER', false, cutOff)).toBe(true);
    expect(isShaded('HIT', true, cutOff)).toBe(true);
    expect(isShaded('OTHER', true, cutOff)).toBe(false);
  });
});

describe('levelShifts', () => {
  test('adds seniors per level change, mildest start first, and leaves out blocks that keep their level', () => {
    const outcomes = runScenario(
      [
        block('to-concerning', 'T1', 1000, 10),
        block('to-vulnerable', 'T1', null, 4),
        block('also-to-concerning', 'T1', 1200, 6),
        block('kept', 'T1', 800, 50),
        block('worse', 'T2', null, 3),
        block('same-level', 'T2', 1200, 9),
      ],
      { centreId: 'C', alsoClosed: [] }
    );
    expect(levelShifts(outcomes)).toEqual([
      { from: 'ok', to: 'concerning', seniors: 16 },
      { from: 'ok', to: 'vulnerable', seniors: 4 },
      { from: 'concerning', to: 'vulnerable', seniors: 3 },
    ]);
  });
});
