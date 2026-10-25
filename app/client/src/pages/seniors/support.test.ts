import { describe, expect, test } from 'vitest';
import { runScenario, type AccessBlock, type Tier } from './scenario';
import { mealSupportList, supportCsv, supportFor } from './support';

const block = (block_id: string, subzone_id: string, tier_now: Tier, options: [string, number][], est_seniors = 10) =>
  ({
    block_id,
    block_label: `${block_id} TOA PAYOH`,
    subzone_id,
    pln_area_n: 'TOA PAYOH',
    lon: 103.85,
    lat: 1.33,
    est_seniors,
    tier_now,
    options: options.map(([centre_id, walk_m]) => ({ centre_id, walk_m })),
  }) satisfies AccessBlock;

const run = (blocks: AccessBlock[]) => runScenario(blocks, { centreId: 'C', alsoClosed: [] });

describe('supportFor', () => {
  test('walking buddy up to 1,800 m after the closure, meal delivery beyond or with no centre', () => {
    const outcomes = run([
      block('a', 'SZ1', 'T1', [
        ['C', 300],
        ['D', 1800],
      ]),
      block('b', 'SZ1', 'T1', [
        ['C', 300],
        ['D', 1801],
      ]),
      block('c', 'SZ1', 'T1', [['C', 300]]),
    ]);
    expect(outcomes.map(supportFor)).toEqual(['Walking buddy', 'Meal delivery', 'Meal delivery']);
  });
});

describe('mealSupportList', () => {
  const outcomes = run([
    block(
      'near',
      'SZ1',
      'T1',
      [
        ['C', 300],
        ['D', 1000],
      ],
      4
    ),
    block(
      'far',
      'SZ1',
      'T1',
      [
        ['C', 300],
        ['D', 1900],
      ],
      3
    ),
    block(
      'other',
      'SZ2',
      'T1',
      [
        ['C', 300],
        ['D', 1100],
      ],
      20
    ),
    block(
      'kept',
      'SZ3',
      'T1',
      [
        ['C', 300],
        ['D', 500],
      ],
      50
    ),
    block(
      'already',
      'SZ3',
      'T2',
      [
        ['C', 1000],
        ['D', 1900],
      ],
      50
    ),
  ]);
  const list = mealSupportList(outcomes);

  test('one row per subzone with seniors cut off, most seniors first', () => {
    expect(list.map((a) => [a.subzone_id, a.seniors])).toEqual([
      ['SZ2', 20],
      ['SZ1', 7],
    ]);
  });

  test('the subzone takes the stricter suggestion, from its furthest block', () => {
    const sz1 = list.find((a) => a.subzone_id === 'SZ1');
    expect(sz1?.support).toBe('Meal delivery');
    expect(sz1?.furthest.outcome.block.block_id).toBe('far');
    expect(sz1?.blocks.map((b) => [b.outcome.block.block_id, b.support])).toEqual([
      ['far', 'Meal delivery'],
      ['near', 'Walking buddy'],
    ]);
  });
});

test('supportCsv writes seniors as plain numbers, under 5 as 0', () => {
  const list = mealSupportList(
    run([
      block(
        'a',
        'SZ1',
        'T1',
        [
          ['C', 300],
          ['D', 1000],
        ],
        3
      ),
      block(
        'b',
        'SZ1',
        'T1',
        [
          ['C', 300],
          ['D', 900.5],
        ],
        1234
      ),
    ])
  );
  const seniors = supportCsv(list, { subzone: () => 'X', centre: () => 'Y' }, new Set())
    .trim()
    .split('\n')
    .slice(1)
    .map((row) => row.split(',')[4]);
  expect(seniors).toEqual(['0', '1235']);
});

test('supportCsv has one row per block, quotes commas and marks priority areas', () => {
  const list = mealSupportList(
    run([
      block(
        'a',
        'SZ1',
        'T1',
        [
          ['C', 300],
          ['D', 1000.4],
        ],
        12
      ),
    ])
  );
  const csv = supportCsv(
    list,
    { subzone: () => 'TOA PAYOH CENTRAL, NORTH', centre: (id) => `Centre ${id}` },
    new Set(['SZ1'])
  );
  expect(csv.split('\n')).toEqual([
    'subzone_id,subzone,block_id,block,est_seniors,tier_before,tier_after,nearest_open_centre,walk_m_after,suggested_support,priority',
    'SZ1,"TOA PAYOH CENTRAL, NORTH",a,a TOA PAYOH,10,T1,T2,Centre D,1000,Walking buddy,yes',
    '',
  ]);
});
