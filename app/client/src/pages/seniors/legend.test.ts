import { describe, expect, test } from 'vitest';
import { MULTIPLIER_BANDS, tierHex } from './legend';
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
