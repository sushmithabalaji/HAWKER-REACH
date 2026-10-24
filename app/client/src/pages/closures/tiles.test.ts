import { describe, expect, test } from 'vitest';
import type { Tiles } from '@shared/closure-engine';
import { headlineTiles } from './tiles';

const limits = { limitMin: 15, cutoffM: 2000 };

const tiles: Tiles = {
  displaced: { tag: 'MODELLED', source: 'gold.block_options', dinersPerDay: 1230, unservedDinersPerDay: 44.6 },
  biggestLoad: {
    tag: 'MODELLED',
    source: 'gold.block_options · gold.centres · gold.centre_demand',
    centre: {
      centreId: 'C2',
      name: 'Toa Payoh West Market and Food Centre',
      extraDinersPerStall: 3.24,
      pctOverBaseline: 34.4,
    },
  },
  accessLoss: { tag: 'MODELLED', source: 'gold.block_options', senior: 3, typical: 5, brisk: 1208, limitMin: 15 },
  verdict: {
    tag: 'MODELLED',
    source: 'gold.block_options · gold.centres · gold.centre_demand',
    status: 'red',
    counts: { red: 1, yellow: 2, green: 0 },
  },
};

describe('headlineTiles', () => {
  test('the four tiles, each with its tag and source', () => {
    expect(headlineTiles(tiles, limits)).toEqual([
      {
        value: '≈1,230',
        label: 'displaced diners a day',
        note: '+40 diners a day newly unserved (no centre within 2 km)',
        tag: 'MODELLED',
        source: 'gold.block_options',
      },
      {
        value: '+3.2',
        label: 'biggest load increase, extra diners per stall',
        note: 'Toa Payoh West · +34%',
        tag: 'MODELLED',
        source: 'gold.block_options · gold.centres · gold.centre_demand',
      },
      {
        value: '3 · 5 · 1,208',
        label: 'blocks losing a centre within 15 min',
        note: 'at senior · typical · brisk pace',
        tag: 'MODELLED',
        source: 'gold.block_options',
      },
      {
        value: 'Red',
        label: 'plan verdict',
        note: '1 red · 2 yellow · 0 green',
        tag: 'MODELLED',
        source: 'gold.block_options · gold.centres · gold.centre_demand',
      },
    ]);
  });

  test('an anchor alone that moves no one', () => {
    const quiet: Tiles = {
      ...tiles,
      displaced: { ...tiles.displaced, dinersPerDay: 0, unservedDinersPerDay: 0 },
      biggestLoad: { ...tiles.biggestLoad, centre: null },
      verdict: { ...tiles.verdict, status: null, counts: { red: 0, yellow: 0, green: 0 } },
    };
    const [displaced, load, , verdict] = headlineTiles(quiet, limits);
    expect(displaced).toMatchObject({ value: '0', note: null });
    expect(load).toMatchObject({ value: '—', note: 'no centre takes extra diners' });
    expect(verdict).toMatchObject({ value: '—', note: 'add centres above to check whether they can close together' });
  });

  test('a receiver with no baseline shows "new", and one with no stalls has no per-stall load', () => {
    const load = (centre: NonNullable<Tiles['biggestLoad']['centre']>) =>
      headlineTiles({ ...tiles, biggestLoad: { ...tiles.biggestLoad, centre } }, limits)[1];
    expect(
      load({ centreId: 'C3', name: 'Market Street', extraDinersPerStall: 1.5, pctOverBaseline: 'new' })
    ).toMatchObject({
      value: '+1.5',
      note: 'Market Street · new diners',
    });
    expect(load({ centreId: 'C4', name: 'Adam Road', extraDinersPerStall: null, pctOverBaseline: 12 })).toMatchObject({
      value: '—',
      note: 'Adam Road · no stalls recorded · +12%',
    });
  });
});
