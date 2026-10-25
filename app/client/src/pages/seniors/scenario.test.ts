import { describe, expect, test } from 'vitest';
import {
  areasCutOff,
  isPriority,
  priorityAreaIds,
  roughCount,
  severityOf,
  roundedCount,
  runScenario,
  summarise,
  tierOf,
  toAccessBlock,
  toAccessBlocks,
  type AccessBlock,
  type Tier,
} from './scenario';

// A block whose nearest centres are given nearest first, as [centre_id, walk_m].
const block = (block_id: string, tier_now: Tier, options: [string, number][], est_seniors = 10, subzone_id = 'SZ1') =>
  ({
    block_id,
    block_label: `Blk ${block_id}`,
    subzone_id,
    pln_area_n: 'TOA PAYOH',
    lon: 103.85,
    lat: 1.33,
    est_seniors,
    tier_now,
    options: options.map(([centre_id, walk_m]) => ({ centre_id, walk_m })),
  }) satisfies AccessBlock;

describe('tierOf at 15 min', () => {
  test('T1 to T3 are the distances a senior, typical and brisk walker cover', () => {
    expect([900, 901, 1080, 1081, 1260, 1261].map((m) => tierOf(m))).toEqual(['T1', 'T2', 'T2', 'T3', 'T3', 'T4']);
  });

  test('no centre within the cutoff is T4', () => {
    expect(tierOf(null)).toBe('T4');
  });

  test('other limits scale the bands', () => {
    expect(tierOf(700, 10)).toBe('T2');
    expect(tierOf(1200, 20)).toBe('T1');
    expect(tierOf(1201, 20)).toBe('T2');
  });
});

describe('toAccessBlock', () => {
  test('parses strings and drops centres beyond the cutoff', () => {
    const b = toAccessBlock({
      block_id: 'B1',
      block_label: '1 TOA PAYOH',
      subzone_id: 'TPSZ01',
      pln_area_n: 'TOA PAYOH',
      lon: '103.85',
      lat: '1.33',
      est_seniors: '12.5',
      tier_now: 'T1',
      nearest_centre_id: 'HC_1',
      nearest_walk_m: '400',
      second_centre_id: 'HC_2',
      second_walk_m: '1100.5',
      third_centre_id: '',
      third_walk_m: '',
    });
    expect(b?.est_seniors).toBe(12.5);
    expect(b?.options).toEqual([
      { centre_id: 'HC_1', walk_m: 400 },
      { centre_id: 'HC_2', walk_m: 1100.5 },
    ]);
  });

  test('a block with no centre in range has no options', () => {
    const b = toAccessBlock({
      block_id: 'B2',
      lon: '103.79',
      lat: '1.44',
      tier_now: 'T4',
      nearest_centre_id: null,
      nearest_walk_m: null,
    });
    expect(b?.options).toEqual([]);
    expect(b?.tier_now).toBe('T4');
  });

  test('blocks with no coordinates are left out, so they never pull the map off Singapore', () => {
    const rows = [
      { block_id: 'B3', lon: '', lat: '1.3', tier_now: 'T1' },
      { block_id: 'B4', lon: '103.8', lat: '1.3', tier_now: 'T1' },
    ];
    expect(toAccessBlocks(rows).map((b) => b.block_id)).toEqual(['B4']);
  });
});

describe('runScenario', () => {
  test('only blocks whose nearest centre closes are affected', () => {
    const blocks = [
      block('a', 'T1', [
        ['C', 300],
        ['D', 500],
      ]),
      block('b', 'T1', [
        ['D', 300],
        ['C', 400],
      ]),
    ];
    expect(runScenario(blocks, { centreId: 'C', alsoClosed: [] }).map((o) => o.block.block_id)).toEqual(['a']);
  });

  test('the block moves to its next nearest centre', () => {
    const [o] = runScenario(
      [
        block('a', 'T1', [
          ['C', 300],
          ['D', 1000],
        ]),
      ],
      { centreId: 'C', alsoClosed: [] }
    );
    expect(o).toMatchObject({ after: 'T2', afterCentreId: 'D', afterWalkM: 1000 });
  });

  test('a centre closed at the same time is skipped for the next one still open', () => {
    const blocks = [
      block('a', 'T1', [
        ['C', 300],
        ['D', 500],
        ['E', 1200],
      ]),
    ];
    const [o] = runScenario(blocks, { centreId: 'C', alsoClosed: ['D'] });
    expect(o).toMatchObject({ after: 'T3', afterCentreId: 'E' });
  });

  test('second and third both closed, or no other centre in range, is T4', () => {
    const blocks = [
      block('a', 'T1', [
        ['C', 300],
        ['D', 500],
        ['E', 600],
      ]),
      block('b', 'T1', [['C', 300]]),
    ];
    const outcomes = runScenario(blocks, { centreId: 'C', alsoClosed: ['D', 'E'] });
    expect(outcomes.map((o) => [o.after, o.afterCentreId])).toEqual([
      ['T4', null],
      ['T4', null],
    ]);
  });

  test('outcome groups follow ASSUMPTIONS.md', () => {
    const blocks = [
      block('cut', 'T1', [
        ['C', 300],
        ['D', 1000],
      ]),
      block('cut-no-one', 'T1', [
        ['C', 300],
        ['D', 1900],
      ]),
      block('kept', 'T1', [
        ['C', 300],
        ['D', 800],
      ]),
      block('already', 'T2', [
        ['C', 1000],
        ['D', 1100],
      ]),
      block('already-worse', 'T3', [['C', 1200]]),
      block('already-t4', 'T4', [['C', 1500]]),
    ];
    const groups = runScenario(blocks, { centreId: 'C', alsoClosed: [] }).map((o) => [
      o.block.block_id,
      o.group,
      o.noOneCanWalk,
      o.nowWorse,
    ]);
    expect(groups).toEqual([
      ['cut', 'cut-off', false, false],
      ['cut-no-one', 'cut-off', true, false],
      ['kept', 'unaffected', false, false],
      ['already', 'already-without', false, false],
      ['already-worse', 'already-without', false, true],
      ['already-t4', 'already-without', false, false],
    ]);
  });
});

describe('summarise', () => {
  test('totals blocks and seniors per group, with the sub-lines', () => {
    const blocks = [
      block(
        'cut',
        'T1',
        [
          ['C', 300],
          ['D', 1000],
        ],
        10
      ),
      block('cut-no-one', 'T1', [['C', 300]], 5),
      block(
        'kept',
        'T1',
        [
          ['C', 300],
          ['D', 800],
        ],
        7
      ),
      block('already-worse', 'T2', [['C', 1000]], 3),
    ];
    const s = summarise(runScenario(blocks, { centreId: 'C', alsoClosed: [] }));
    expect(s).toEqual({
      groups: {
        'cut-off': { blocks: 2, seniors: 15 },
        'already-without': { blocks: 1, seniors: 3 },
        unaffected: { blocks: 1, seniors: 7 },
      },
      noOneCanWalk: { blocks: 1, seniors: 5 },
      nowWorse: { blocks: 1, seniors: 3 },
    });
  });
});

describe('areasCutOff', () => {
  test('seniors cut off per subzone, most first, leaving out subzones with none', () => {
    const blocks = [
      block(
        'a',
        'T1',
        [
          ['C', 300],
          ['D', 1000],
        ],
        4,
        'SZ1'
      ),
      block(
        'b',
        'T1',
        [
          ['C', 300],
          ['D', 1000],
        ],
        9,
        'SZ2'
      ),
      block(
        'c',
        'T1',
        [
          ['C', 300],
          ['D', 1000],
        ],
        2,
        'SZ1'
      ),
      block(
        'd',
        'T1',
        [
          ['C', 300],
          ['D', 500],
        ],
        50,
        'SZ3'
      ),
    ];
    expect(areasCutOff(runScenario(blocks, { centreId: 'C', alsoClosed: [] }))).toEqual([
      { subzone_id: 'SZ2', seniors: 9, blocks: 1, noOneCanWalk: false },
      { subzone_id: 'SZ1', seniors: 6, blocks: 2, noOneCanWalk: false },
    ]);
  });

  test('marks a subzone where a block has no centre anyone can walk to', () => {
    const blocks = [
      block(
        'a',
        'T1',
        [
          ['C', 300],
          ['D', 1000],
        ],
        4,
        'SZ1'
      ),
      block('b', 'T1', [['C', 300]], 3, 'SZ1'),
    ];
    expect(areasCutOff(runScenario(blocks, { centreId: 'C', alsoClosed: [] }))).toEqual([
      { subzone_id: 'SZ1', seniors: 7, blocks: 2, noOneCanWalk: true },
    ]);
  });
});

describe('isPriority', () => {
  const area = (noOneCanWalk: boolean) => ({ subzone_id: 'SZ1', seniors: 10, blocks: 1, noOneCanWalk });

  test('a subzone where no one can walk to a centre, or a super-aged one, is a priority', () => {
    expect(isPriority(area(true), false)).toBe(true);
    expect(isPriority(area(false), true)).toBe(true);
    expect(isPriority(area(true), true)).toBe(true);
  });

  test('a subzone with only a longer walk, and not super-aged, is not', () => {
    expect(isPriority(area(false), false)).toBe(false);
  });
});

describe('priorityAreaIds', () => {
  test('keeps the areas where no one can walk or that are super-aged', () => {
    const areas = [
      { subzone_id: 'WALK', seniors: 10, blocks: 1, noOneCanWalk: true },
      { subzone_id: 'OLD', seniors: 10, blocks: 1, noOneCanWalk: false },
      { subzone_id: 'NEITHER', seniors: 10, blocks: 1, noOneCanWalk: false },
    ];
    expect(priorityAreaIds(areas, (id) => id === 'OLD')).toEqual(new Set(['WALK', 'OLD']));
  });
});

describe('severityOf', () => {
  const summaryWith = (cutOff: number, noOneCanWalk: number) => {
    const s = summarise([]);
    s.groups['cut-off'].seniors = cutOff;
    s.noOneCanWalk.seniors = noOneCanWalk;
    return s;
  };

  test('none when no senior is cut off', () => {
    expect(severityOf(summaryWith(0, 0), 0)).toBeNull();
  });

  test('severe at 3 priority areas or 50 seniors no one can walk for', () => {
    expect(severityOf(summaryWith(200, 0), 3)).toBe('Severe');
    expect(severityOf(summaryWith(200, 50), 1)).toBe('Severe');
  });

  test('moderate with any priority area, low with none', () => {
    expect(severityOf(summaryWith(200, 49), 2)).toBe('Moderate');
    expect(severityOf(summaryWith(200, 0), 0)).toBe('Low');
  });
});

describe('roughCount', () => {
  test('rounds estimates to the nearest 5, and says <5 for a few', () => {
    expect([0, 0.4, 3, 7, 1234].map(roughCount)).toEqual(['0', '<5', '<5', '5', '1,235']);
  });

  test('roundedCount is the same rounding as a number, with under 5 as 0', () => {
    expect([0, 0.4, 3, 7, 1234].map(roundedCount)).toEqual([0, 0, 0, 5, 1235]);
  });
});
