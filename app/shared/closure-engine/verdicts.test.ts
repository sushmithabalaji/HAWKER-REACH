import { describe, expect, it } from 'vitest';
import { evaluatePlan } from '.';
import type { CentreClosureRow } from './gold';
import { assumptions, block, centre, town, withValues } from './sample';

// Every centre has 10 stalls, so extra diners per stall = extra diners ÷ 10.
// Single closures and their worst neighbour's extra diners per stall:
//   A → D 2, B → D 4, C → D 4, and five padding pairs P → Q: 5, 6, 7, 8, 8.
//   D, and every Q, is nobody's fallback, so their closures move nobody and don't count.
// Sorted [2, 4, 4, 5, 6, 7, 8, 8]: median 5.5, 0.75 quantile 7.25 (linear, as Spark's percentile).
const PADDING = [5, 6, 7, 8, 8];

function verdictTown(extraBlocks: ReturnType<typeof block>[] = []) {
  return town(
    [
      centre('HC_A', { name: 'Anchor Market' }),
      centre('HC_B', { name: 'Bedok Corner' }),
      centre('HC_C', { name: 'Clementi Court' }),
      centre('HC_D', { name: 'Dover Food Centre' }),
      ...PADDING.flatMap((_, i) => [centre(`HC_P${i}`), centre(`HC_Q${i}`)]),
    ],
    [
      block(
        'bA',
        [
          ['HC_A', 300],
          ['HC_D', 800],
        ],
        { diners: 20 }
      ),
      block(
        'bB',
        [
          ['HC_B', 300],
          ['HC_D', 700],
        ],
        { diners: 40 }
      ),
      block(
        'bC',
        [
          ['HC_C', 300],
          ['HC_D', 700],
        ],
        { diners: 40 }
      ),
      block('bD', [['HC_D', 200]], { diners: 10 }),
      ...PADDING.map((perStall, i) =>
        block(
          `bP${i}`,
          [
            [`HC_P${i}`, 300],
            [`HC_Q${i}`, 600],
          ],
          { diners: perStall * 10 }
        )
      ),
      ...extraBlocks,
    ]
  );
}

describe('evaluatePlan: load benchmark', () => {
  it('takes the median and 0.75 quantile of the worst neighbour over every single closure', () => {
    const { benchmark } = evaluatePlan(verdictTown(), 'HC_A', [], assumptions);

    expect(benchmark).toMatchObject({ typical: 5.5, threeInFour: 7.25 });
  });

  it('reads both quantiles from assumptions and returns them for the Assumptions panel', () => {
    const quantiles = withValues({ 'verdict.load.yellow_quantile': 0.25, 'verdict.load.red_quantile': 1 });

    const { benchmark } = evaluatePlan(verdictTown(), 'HC_A', [], quantiles);

    // 0.25 quantile of [2, 4, 4, 5, 6, 7, 8, 8]: position 1.75, between 4 and 4.
    expect(benchmark).toEqual({ typical: 4, threeInFour: 8, typicalQuantile: 0.25, threeInFourQuantile: 1 });
  });
});

describe('evaluatePlan: verdict cards', () => {
  it('makes both cards red when B and C together push D past the 3-in-4 benchmark, and names D', () => {
    // A + B + C: D takes 2 + 4 + 4 = 10 per stall. Without B, or without C: 6, under 7.25.
    const { cards } = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_C'], assumptions);

    expect(cards.map((c) => [c.centreId, c.status, c.rule])).toEqual([
      ['HC_B', 'red', 'load'],
      ['HC_C', 'red', 'load'],
    ]);
    expect(cards.map((c) => c.pastBenchmark.map((p) => p.centreId))).toEqual([['HC_D'], ['HC_D']]);
  });

  it('makes a card yellow when it pushes a centre past the typical benchmark but not the 3-in-4 one', () => {
    // A + B: D takes 2 + 4 = 6 per stall, above 5.5 and under 7.25. Without B: 2.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_B'], assumptions).cards;

    expect(card).toMatchObject({ status: 'yellow', rule: 'load' });
    expect(card.pastBenchmark).toEqual([
      { centreId: 'HC_D', name: 'Dover Food Centre', extraDinersPerStall: 6, withoutThisCentre: 2 },
    ]);
  });

  it('makes a card green when it pushes no centre past either benchmark', () => {
    // A + P0: Q0 takes 5 per stall, under 5.5.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;

    expect(card).toMatchObject({ status: 'green', rule: null, pastBenchmark: [] });
  });

  it('checks Access before Load, and the reason names the rule and its numbers', () => {
    // C is the only centre within 900 m of bCx; its fallback D is 1,200 m away.
    // C's single closure is now 5 per stall, and the benchmark stays 5.5 / 7.25.
    const town = verdictTown([
      block(
        'bCx',
        [
          ['HC_C', 400],
          ['HC_D', 1200],
        ],
        { diners: 10, seniors: 5 }
      ),
    ]);

    // A + B + C: D takes 11 per stall. Without C: 6 (Load would fire too). Without B: 7.
    const [bedok, clementi] = evaluatePlan(town, 'HC_A', ['HC_B', 'HC_C'], assumptions).cards;

    expect(clementi).toMatchObject({ status: 'red', rule: 'access' });
    expect(clementi.reason).toBe(
      'Closing Clementi Court too leaves 1 more block (5 seniors) with no centre within 15 min at senior pace.'
    );
    expect(bedok).toMatchObject({ status: 'red', rule: 'load' });
    expect(bedok.reason).toBe(
      'Closing Bedok Corner too pushes Dover Food Centre to 11.0 extra diners per stall (7.0 without it), above the 3-in-4 benchmark of 7.3.'
    );
  });

  it('gives the numbers for yellow and green too', () => {
    const [yellow] = evaluatePlan(verdictTown(), 'HC_A', ['HC_B'], assumptions).cards;
    const [green] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;

    expect(yellow.reason).toBe(
      'Closing Bedok Corner too pushes Dover Food Centre to 6.0 extra diners per stall (2.0 without it), above the typical benchmark of 5.5.'
    );
    expect(green.reason).toBe(
      'Closing Centre HC_P0 too cuts no one off and pushes no centre past the typical benchmark of 5.5.'
    );
  });

  it('counts a block that becomes newly unserved as cut off, even if it was beyond the senior limit before', () => {
    // bCfar is 1,000 m from C (too far for a senior already) and has no other centre within 2 km.
    const town = verdictTown([block('bCfar', [['HC_C', 1000]], { diners: 10, seniors: 4 })]);

    const [card] = evaluatePlan(town, 'HC_A', ['HC_C'], assumptions).cards;

    expect(card).toMatchObject({ status: 'red', rule: 'access', cutOff: { blocks: 1, seniors: 4 } });
  });

  it('reads the access threshold from assumptions', () => {
    const town = verdictTown([block('bCfar', [['HC_C', 1000]], { diners: 10, seniors: 4 })]);

    const [card] = evaluatePlan(town, 'HC_A', ['HC_C'], withValues({ 'verdict.access.min_new_blocks': 2 })).cards;

    // One block isn't enough, so Load decides: A + C put D at 2 + 4 = 6, above 5.5.
    expect(card).toMatchObject({ status: 'yellow', rule: 'load' });
  });

  it('returns the share of displaced diners, which never sets the colour', () => {
    // A + P0 displaces A's 20 and P0's 50 diners: P0's share is 50 / 70, and it is still green.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;

    expect(card.status).toBe('green');
    expect(card.shareOfDisplaced).toBeCloseTo(50 / 70);
  });

  it('lists the centres it pushes, by how much, and the blocks losing access at each pace', () => {
    const town = verdictTown([
      block(
        'bCx',
        [
          ['HC_C', 400],
          ['HC_D', 1200],
        ],
        { diners: 10, seniors: 5 }
      ),
    ]);

    const [, clementi] = evaluatePlan(town, 'HC_A', ['HC_B', 'HC_C'], assumptions).cards;

    expect(clementi.pushes).toEqual([
      { centreId: 'HC_D', name: 'Dover Food Centre', extraDinersPerStall: 11, withoutThisCentre: 6 },
    ]);
    // bCx goes from 400 m to 1,200 m: past 900 and 1,080, within 1,260.
    expect(clementi.accessLoss).toEqual({ senior: 1, typical: 1, brisk: 0 });
  });
});

describe('evaluatePlan: NEA actions', () => {
  // Baseline diners per stall: A 100, Z 0, B 100, C 30. Median 65, so actions start above 0.2 × 65 = 13.
  const data = town(
    [
      centre('HC_A', { stalls: 10, baseline: 1000 }),
      centre('HC_Z', { stalls: 4, baseline: 0, name: 'Zero Baseline Market' }),
      centre('HC_B', { stalls: 10, baseline: 1000, name: 'Busy Centre' }),
      centre('HC_C', { stalls: 10, baseline: 300 }),
    ],
    [
      block(
        'b1',
        [
          ['HC_A', 300],
          ['HC_Z', 500],
        ],
        { diners: 60 }
      ),
      block(
        'b2',
        [
          ['HC_A', 350],
          ['HC_B', 500],
        ],
        { diners: 120 }
      ),
      block(
        'b3',
        [
          ['HC_C', 300],
          ['HC_B', 700],
        ],
        { diners: 40 }
      ),
    ]
  );

  it('flags every centre above the per-stall threshold, including one with a 0 baseline', () => {
    // A alone: Z takes 60 / 4 = 15 (above 13), B takes 12 (not).
    const { neaActions } = evaluatePlan(data, 'HC_A', [], assumptions);

    expect(neaActions.threshold).toBe(13);
    expect(neaActions.centres).toEqual([{ centreId: 'HC_Z', name: 'Zero Baseline Market', extraDinersPerStall: 15 }]);
  });

  it('lists on a card the centres it pushes past the threshold', () => {
    // A + C: B takes 12 + 4 = 16.
    const result = evaluatePlan(data, 'HC_A', ['HC_C'], assumptions);

    expect(result.neaActions.centres.map((c) => c.centreId)).toEqual(['HC_B', 'HC_Z']);
    expect(result.cards[0].neaActions).toEqual([{ centreId: 'HC_B', name: 'Busy Centre', extraDinersPerStall: 16 }]);
  });

  it('never changes the colour', () => {
    // With a tiny share every receiver needs actions, yet A + P0 stays green (Q0 takes 5 per stall).
    const [card] = evaluatePlan(
      verdictTown(),
      'HC_A',
      ['HC_P0'],
      withValues({ 'actions.waste.extra_per_stall_share': 0.01 })
    ).cards;

    expect(card.neaActions.map((c) => c.centreId)).toEqual(['HC_Q0']);
    expect(card.status).toBe('green');
  });
});

describe('evaluatePlan: card notes', () => {
  const closure = (centre_id: string, type: CentreClosureRow['type'], start_date: string, end_date: string) => ({
    closure_id: `${centre_id}-${type}-${start_date}`,
    centre_id,
    type,
    start_date,
    end_date,
    duration_days: 0,
    remarks: null,
  });

  it('carries the possibly under-counted flag on cards and receivers', () => {
    const data = town(
      [centre('HC_A'), centre('HC_B', { undercounted: true }), centre('HC_C', { undercounted: true })],
      [
        block(
          'b1',
          [
            ['HC_A', 300],
            ['HC_C', 600],
          ],
          { diners: 30 }
        ),
      ]
    );

    const result = evaluatePlan(data, 'HC_A', ['HC_B'], assumptions);

    expect(result.cards[0].possiblyUndercounted).toBe(true);
    expect(result.receivers[0]).toMatchObject({ centreId: 'HC_C', possiblyUndercounted: true });
  });

  it('notes overlapping renovation or redevelopment closures between centres in the plan, ignoring cleaning', () => {
    const data = town(
      [centre('HC_A'), centre('HC_B', { name: 'Bedok Corner' }), centre('HC_C', { name: 'Clementi Court' })],
      [],
      [
        closure('HC_B', 'renovation', '2026-11-01', '2027-01-31'),
        closure('HC_C', 'redevelopment', '2027-01-15', '2027-06-30'),
        closure('HC_C', 'cleaning', '2026-11-10', '2026-11-11'),
        closure('HC_A', 'renovation', '2025-03-01', '2025-05-31'),
      ]
    );

    const [bedok, clementi] = evaluatePlan(data, 'HC_A', ['HC_B', 'HC_C'], assumptions).cards;

    expect(bedok.overlaps).toEqual([
      {
        withCentreId: 'HC_C',
        withName: 'Clementi Court',
        own: { type: 'renovation', startDate: '2026-11-01', endDate: '2027-01-31' },
        other: { type: 'redevelopment', startDate: '2027-01-15', endDate: '2027-06-30' },
      },
    ]);
    expect(clementi.overlaps.map((o) => o.withCentreId)).toEqual(['HC_B']);
  });
});

describe('evaluatePlan: whole-plan line', () => {
  it('takes the worst card colour, with R · Y · G counts for the tile and the takeaway', () => {
    // A + B + P0: B pushes D to 6 (yellow); P0 is green. A alone puts D at 2 (green).
    const { plan, tiles, takeaway } = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_P0'], assumptions);

    expect(plan).toMatchObject({ status: 'yellow', counts: { red: 0, yellow: 1, green: 1 }, anchorProblems: [] });
    expect(tiles.verdict).toMatchObject({ status: 'yellow', counts: { red: 0, yellow: 1, green: 1 }, tag: 'MODELLED' });
    expect(takeaway.verdict).toEqual({ status: 'yellow', counts: { red: 0, yellow: 1, green: 1 } });
  });

  it('counts problems the anchor causes alone, and lists them', () => {
    // P3 alone pushes Q3 to 8 per stall, above 7.25. The P0 card is green, but the plan is red.
    const { plan } = evaluatePlan(verdictTown(), 'HC_P3', ['HC_P0'], assumptions);

    expect(plan.status).toBe('red');
    expect(plan.counts).toEqual({ red: 0, yellow: 0, green: 1 });
    expect(plan.anchorProblems).toEqual([
      'Closing Centre HC_P3 on its own pushes Centre HC_Q3 to 8.0 extra diners per stall (0.0 without it), above the 3-in-4 benchmark of 7.3.',
    ]);
  });

  it('judges an anchor-only plan by the anchor alone', () => {
    const { plan, cards } = evaluatePlan(verdictTown(), 'HC_A', [], assumptions);

    expect(cards).toEqual([]);
    expect(plan).toMatchObject({ status: 'green', counts: { red: 0, yellow: 0, green: 0 }, anchorProblems: [] });
  });
});
