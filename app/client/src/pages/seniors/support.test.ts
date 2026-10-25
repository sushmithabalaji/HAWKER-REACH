import { describe, expect, test } from 'vitest';
import { runScenario, type AccessBlock, type Tier } from './scenario';
import { rankAreas, supportList, supportCsv, supportFor } from './support';

const notSuperAged = () => false;

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
  test('a shuttle while an open centre is within 2 km, meals brought in with none', () => {
    const outcomes = run([
      block('a', 'SZ1', 'T1', [
        ['C', 300],
        ['D', 1950],
      ]),
      block('b', 'SZ1', 'T1', [['C', 300]]),
    ]);
    expect(outcomes.map(supportFor)).toEqual(['Shuttle', 'Meal delivery or vouchers']);
  });
});

describe('supportList', () => {
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
    block('none', 'SZ2', 'T1', [['C', 300]], 20),
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
  const supportsOf = (list: ReturnType<typeof supportList>, id: string) =>
    list.find((a) => a.subzone_id === id)?.supports.map((s) => s.support);

  test('one row per subzone with seniors cut off, most seniors first; equal blocks furthest walk first', () => {
    const list = supportList(outcomes, notSuperAged);
    expect(list.map((a) => [a.subzone_id, a.seniors])).toEqual([
      ['SZ2', 20],
      ['SZ1', 7],
    ]);
    expect(list[1].blocks.map((b) => b.outcome.block.block_id)).toEqual(['far', 'near']);
    expect(list[1].alternative).toEqual({ centreId: 'D', walkM: 1000 });
    expect(list[0].alternative).toBeNull();
  });

  test('ranks blocks no one can walk from first, then most seniors, then longest walk', () => {
    const [area] = supportList(
      run([
        block('few-stranded', 'SZ1', 'T1', [['C', 300]], 5),
        block(
          'many',
          'SZ1',
          'T1',
          [
            ['C', 300],
            ['D', 1000],
          ],
          80
        ),
        block(
          'some',
          'SZ1',
          'T1',
          [
            ['C', 300],
            ['D', 1200], // brisk walkers can still make it, so not "no one can walk"
          ],
          30
        ),
      ]),
      notSuperAged
    );
    expect(area.blocks.map((b) => b.outcome.block.block_id)).toEqual(['few-stranded', 'many', 'some']);
    // The shuttle still goes from the block with the shortest walk left.
    expect(area.alternative).toEqual({ centreId: 'D', walkM: 1000 });
  });

  test('a mixed area gets a shuttle to its in-range centre and meals for the rest', () => {
    const [area] = supportList(
      run([
        block('none', 'SZ1', 'T1', [['C', 300]]),
        block('in', 'SZ1', 'T1', [
          ['C', 300],
          ['D', 1500],
        ]),
      ]),
      notSuperAged
    );
    expect(area.alternative).toEqual({ centreId: 'D', walkM: 1500 });
    expect(area.supports.map((s) => s.support)).toEqual(['Shuttle', 'Meal delivery or vouchers']);
  });

  test('no check-ins until the share aged 65+ has loaded', () => {
    expect(supportsOf(supportList(outcomes, null), 'SZ2')).toEqual(['Meal delivery or vouchers']);
  });

  test('only the supports an area triggers, each with a reason', () => {
    const list = supportList(outcomes, notSuperAged);
    expect(supportsOf(list, 'SZ1')).toEqual(['Shuttle']);
    expect(supportsOf(list, 'SZ2')).toEqual(['Meal delivery or vouchers']);
    expect(list[0].supports[0].reason).toBe('1 block has no centre within 2 km');
  });

  test('volunteer check-ins for a super-aged area where some block has no centre anyone can walk to', () => {
    expect(
      supportsOf(
        supportList(outcomes, (id) => id === 'SZ2'),
        'SZ2'
      )
    ).toEqual(['Meal delivery or vouchers', 'Volunteer check-ins']);
    // SZ1's blocks are T1 → T2 and T1 → T4 at 1,900 m, so super-aged SZ1 gets check-ins too.
    expect(
      supportsOf(
        supportList(outcomes, (id) => id === 'SZ1'),
        'SZ1'
      )
    ).toEqual(['Shuttle', 'Volunteer check-ins']);
  });

  test('a temporary food point once 100 seniors in the area have no centre in range', () => {
    const area = (seniors: number) =>
      supportList(run([block('a', 'SZ1', 'T1', [['C', 300]], seniors)]), notSuperAged)[0];
    expect(area(100).supports.map((s) => s.support)).toEqual(['Meal delivery or vouchers', 'Temporary food point']);
    expect(area(99).supports.map((s) => s.support)).toEqual(['Meal delivery or vouchers']);
  });
});

test('supportCsv writes seniors as plain numbers, under 5 as 0, blocks in rank order', () => {
  const list = supportList(
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
    ]),
    notSuperAged
  );
  const seniors = supportCsv(list, { subzone: () => 'X', centre: () => 'Y' }, new Set(), () => null)
    .trim()
    .split('\n')
    .slice(1)
    .map((row) => row.split(',')[4]);
  expect(seniors).toEqual(['1235', '0']); // most vulnerable block first, as in the list
});

test('supportCsv has one row per block, quotes commas and marks priority areas', () => {
  const list = supportList(
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
    ]),
    notSuperAged
  );
  const csv = supportCsv(
    list,
    { subzone: () => 'TOA PAYOH CENTRAL, NORTH', centre: (id) => `Centre ${id}` },
    new Set(['SZ1']),
    () => 1.437
  );
  expect(csv.split('\n')).toEqual([
    'subzone_id,subzone,block_id,block,est_seniors,tier_before,tier_after,nearest_open_centre,walk_m_after,block_support,area_supports,priority,vulnerability_multiplier',
    'SZ1,"TOA PAYOH CENTRAL, NORTH",a,a TOA PAYOH,10,T1,T2,Centre D,1000,Shuttle,Shuttle,yes,1.44',
    '',
  ]);
});

describe('rankAreas', () => {
  const areas = ['A', 'B', 'C', 'D'].map((subzone_id) => ({ subzone_id }));

  test('priority areas first, each group keeping its order', () => {
    expect(rankAreas(areas, new Set(['C', 'B'])).map((a) => a.subzone_id)).toEqual(['B', 'C', 'A', 'D']);
  });

  test('unchanged until the priority areas are known', () => {
    expect(rankAreas(areas, null).map((a) => a.subzone_id)).toEqual(['A', 'B', 'C', 'D']);
  });
});
