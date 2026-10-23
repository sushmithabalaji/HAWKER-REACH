import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { resolveLine, UNSOURCED, type Assumptions } from './assumptions';

const sample: Assumptions = {
  'walk.pace.senior': {
    name: 'Senior walking pace',
    value: 1.0,
    unit: 'm/s',
    tag: 'ASSUMPTION',
    source: 'gait-speed study',
    status: 'open',
    owner: 'Sushmitha',
    used_by: ['spec1'],
  },
  'walk.cutoff_m': {
    name: 'Walking distance cutoff',
    value: 2000,
    unit: 'm',
    tag: 'ASSUMPTION',
    source: 'silver.dist_matrix',
    status: 'decided',
    owner: 'Sushmitha',
    used_by: ['spec1'],
  },
};

describe('resolveLine', () => {
  test('reads name, value, unit, tag and source from an assumptions.json key', () => {
    expect(resolveLine({ key: 'walk.cutoff_m' }, sample)).toEqual({
      text: 'Walking distance cutoff: 2000 m',
      tag: 'ASSUMPTION',
      source: 'silver.dist_matrix',
    });
  });

  test('flags open values: still needs a source, or illustrative when there is none', () => {
    expect(resolveLine({ key: 'walk.pace.senior' }, sample).source).toBe('gait-speed study (source still needed)');
    expect(
      resolveLine({ text: 'Waste per meal', tag: 'ASSUMPTION', source: '', status: 'open' }).source,
    ).toBe(UNSOURCED);
  });

  test('shows a known limitation without a tag', () => {
    expect(resolveLine({ limitation: '6 centres get 0 modelled residents' })).toEqual({
      text: '6 centres get 0 modelled residents',
      tag: null,
      source: 'Known limitation',
    });
  });

  test('keeps written-out lines as they are', () => {
    const line = { text: 'Blocks counted', tag: 'MEASURED', source: 'gold.block_access', status: 'sourced' } as const;
    expect(resolveLine(line)).toEqual({ text: 'Blocks counted', tag: 'MEASURED', source: 'gold.block_access' });
  });

  test('fails loudly on an unknown key', () => {
    expect(() => resolveLine({ key: 'walk.nope' }, sample)).toThrow('Unknown assumptions.json key: walk.nope');
  });
});

// The repo-root file isn't uploaded with app/, so this only runs in a full checkout.
const rootFile = path.resolve(__dirname, '../../assumptions.json');

describe('assumptions.json copy', () => {
  test.skipIf(!existsSync(rootFile))('matches the repo-root file (run `npm run sync:assumptions`)', () => {
    const root = readFileSync(rootFile, 'utf8');
    const copy = readFileSync(path.resolve(__dirname, './assumptions.json'), 'utf8');
    expect(JSON.parse(copy)).toEqual(JSON.parse(root));
  });
});
