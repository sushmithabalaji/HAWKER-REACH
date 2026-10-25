import { describe, expect, it } from 'vitest';
import { evaluatePlan } from '.';
import type { CentreClosureRow, GoldData } from './gold';
import { assumptions, block, centre, town, verdictTown, withValues } from './sample';

// A copy of a sample town where one centre has a different number of diners today.
function withBaseline(data: GoldData, centreId: string, baselineDiners: number): GoldData {
  return {
    ...data,
    centreDemand: data.centreDemand.map((d) =>
      d.centre_id === centreId ? { ...d, baseline_diners_per_day: baselineDiners } : d
    ),
  };
}

// A block whose nearest centre is A, then C, then D 1,200 m away: only closing A and C together takes it past 900 m.
const bAC = (diners: number, seniors = 5) =>
  block(
    'bAC',
    [
      ['HC_A', 300],
      ['HC_C', 400],
      ['HC_D', 1200],
    ],
    { diners, seniors }
  );

describe('evaluatePlan: verdict cards', () => {
  it('makes both cards red when B and C together push D past 20%, and names D', () => {
    // A + B + C: D takes 20 + 40 + 40 = 100 of its 400 diners, 25% more. A + C without B: 15%. B alone: 10%.
    const { cards } = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_C'], assumptions);

    expect(cards.map((c) => [c.centreId, c.status, c.rule])).toEqual([
      ['HC_B', 'red', 'load'],
      ['HC_C', 'red', 'load'],
    ]);
    expect(cards[0].reason).toBe('Dover Food Centre gets 25% busier');
    expect(cards.map((c) => c.overloaded.map((p) => p.centreId))).toEqual([['HC_D'], ['HC_D']]);
    expect(cards[0].overloaded[0].pct).toBeCloseTo(25);
    expect(cards[0].overloaded[0].ifApart).toBeCloseTo(15);
  });

  it('makes a card yellow when together they push a centre past 10% but not 20%', () => {
    // A + B: D takes 60 of 400, 15% more. A alone: 5%. B alone: 10%, which is not above 10%.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_B'], assumptions).cards;

    expect(card).toMatchObject({ status: 'yellow', rule: 'load', reason: 'Dover Food Centre gets 15% busier' });
    expect(card.overloaded).toHaveLength(1);
    expect(card.overloaded[0]).toMatchObject({ centreId: 'HC_D', name: 'Dover Food Centre' });
    expect(card.overloaded[0].pct).toBeCloseTo(15);
    expect(card.overloaded[0].ifApart).toBeCloseTo(10);
  });

  it('makes a card green, "Too far apart to overlap", when closing together adds nothing', () => {
    // A + P0: P0's diners go to Q0 and A's to D, so no centre is pushed further by both closing.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;

    expect(card).toMatchObject({
      status: 'green',
      rule: null,
      reason: 'Too far apart to overlap',
      overloaded: [],
      details: [],
    });
  });

  it('is red when the added centre is where the anchor’s diners go, whatever the load', () => {
    // A's only fallback is D: 100% of A's displaced diners move there.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_D'], assumptions).cards;

    expect(card).toMatchObject({ status: 'red', rule: 'share', reason: 'Takes 100% of Anchor Market’s diners' });
    expect(card.shareOfRest).toBe(1);
    expect(card.details).toContain('Dover Food Centre takes 100% of Anchor Market’s diners');
  });

  it('is red by share when the added centre takes 10% or more, with the share a whole number', () => {
    const data = town(
      [centre('HC_A', { name: 'Kim Keat Palm' }), centre('HC_D', { name: 'Lorong 5' }), centre('HC_E')],
      [
        block(
          'b1',
          [
            ['HC_A', 300],
            ['HC_D', 600],
          ],
          { diners: 48 }
        ),
        block(
          'b2',
          [
            ['HC_A', 300],
            ['HC_E', 600],
          ],
          { diners: 52 }
        ),
      ]
    );

    const [card] = evaluatePlan(data, 'HC_A', ['HC_D'], assumptions).cards;

    expect(card).toMatchObject({ status: 'red', rule: 'share', reason: 'Takes 48% of Kim Keat Palm’s diners' });
  });

  it('is yellow by share from 5% up to 10%, red from 10%', () => {
    // bAP: A at 300 m, then P0 at 500 m, then D at 850 m (still within a senior’s 900 m). 1.5 of A's 21.5 diners.
    const data = verdictTown([
      block(
        'bAP',
        [
          ['HC_A', 300],
          ['HC_P0', 500],
          ['HC_D', 850],
        ],
        { diners: 1.5 }
      ),
    ]);

    const [card] = evaluatePlan(data, 'HC_A', ['HC_P0'], assumptions).cards;
    expect(card).toMatchObject({ status: 'yellow', rule: 'share', reason: 'Takes 7% of Anchor Market’s diners' });

    const tight = withValues({ 'verdict.share.red': 0.05 });
    expect(evaluatePlan(data, 'HC_A', ['HC_P0'], tight).cards[0]).toMatchObject({ status: 'red', rule: 'share' });
  });

  it('measures the share against the rest of the plan when several centres are added', () => {
    // A, B and C displace 100 diners, all of whom go to D when it stays open.
    const [, , d] = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_C', 'HC_D'], assumptions).cards;

    expect(d.reason).toBe('Takes 100% of the rest of the plan’s diners');
  });

  it('is red when blocks lose a centre only because both close, and the share is small', () => {
    const [card] = evaluatePlan(verdictTown([bAC(0.5)]), 'HC_A', ['HC_C'], assumptions).cards;

    expect(card).toMatchObject({
      status: 'red',
      rule: 'access',
      reason: '1 block loses a centre within 15 min',
      cutOff: { blocks: 1, seniors: 5 },
      accessLoss: { senior: 1, typical: 1, brisk: 0 },
    });
    expect(card.details).toContain('1 more block loses a centre within 15 min if both close');
  });

  it('does not count a block that was already too far to walk to a centre', () => {
    // bACfar is 1,000 m from A (past a senior’s 900 m already) and 1,100 m from C, with no other centre within 2 km.
    const data = verdictTown([
      block(
        'bACfar',
        [
          ['HC_A', 1000],
          ['HC_C', 1100],
        ],
        { diners: 0.5, seniors: 4 }
      ),
    ]);

    const [card] = evaluatePlan(data, 'HC_A', ['HC_C'], assumptions).cards;

    // C still pushes D to 15% with A (yellow), but no one is counted as cut off.
    expect(card).toMatchObject({ status: 'yellow', rule: 'load', cutOff: { blocks: 0, seniors: 0 } });
  });

  it('reads how many blocks make it red from assumptions', () => {
    const [card] = evaluatePlan(
      verdictTown([bAC(0.5)]),
      'HC_A',
      ['HC_C'],
      withValues({ 'verdict.access.min_new_blocks': 2 })
    ).cards;

    // One stranded block is not enough, so load decides: A + C put D at 15%.
    expect(card).toMatchObject({ status: 'yellow', rule: 'load', cutOff: { blocks: 1 } });
  });

  it('checks share, then access, then load', () => {
    // A + B + C: the stranded block makes C red by access before its load on D is looked at; B is red by load.
    const [bedok, clementi] = evaluatePlan(verdictTown([bAC(0.5)]), 'HC_A', ['HC_B', 'HC_C'], assumptions).cards;

    expect(clementi).toMatchObject({ status: 'red', rule: 'access' });
    expect(bedok).toMatchObject({ status: 'red', rule: 'load' });
  });

  it('returns the share of displaced diners, which never sets the colour', () => {
    // A + P0 displaces A's 20 and P0's 50 diners: P0's share is 50 / 70, and it is still green.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;

    expect(card.status).toBe('green');
    expect(card.shareOfDisplaced).toBeCloseTo(50 / 70);
  });

  it('lists the centres it pushes, by how much, and the blocks losing access at each pace', () => {
    const [, clementi] = evaluatePlan(verdictTown([bAC(10)]), 'HC_A', ['HC_B', 'HC_C'], assumptions).cards;

    // D takes 20 + 40 + 40 + 10 = 110 of 400 together (27.5%). Closing A and B without C: 60 (15%). C alone: 40 (10%).
    expect(clementi.pushes).toHaveLength(1);
    expect(clementi.pushes[0]).toMatchObject({ centreId: 'HC_D', name: 'Dover Food Centre' });
    expect(clementi.pushes[0].pct).toBeCloseTo(27.5);
    expect(clementi.pushes[0].ifApart).toBeCloseTo(15);
    // bAC goes from 300 m to 1,200 m: past 900 and 1,080, within 1,260.
    expect(clementi.accessLoss).toEqual({ senior: 1, typical: 1, brisk: 0 });
  });

  it('puts only the lines that are not zero in Read more', () => {
    const [none] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;
    expect(none.details).toEqual([]);

    const [red] = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_C'], assumptions).cards;
    expect(red.details).toEqual(['Dover Food Centre would get 25% busier']);
  });
});

describe('evaluatePlan: only what closing together adds', () => {
  // Bishan (A) has Toa Payoh (B) next door. Changi (Z) is isolated: its only block walks 500 m to Z, and the next
  // centre, Y, is 1,500 m away. A and Z share no block and no neighbour.
  const isolated = (extraBlocks: ReturnType<typeof block>[] = []) =>
    town(
      [centre('HC_A', { name: 'Bishan' }), centre('HC_B'), centre('HC_Z', { name: 'Changi' }), centre('HC_Y')],
      [
        block(
          'bA',
          [
            ['HC_A', 300],
            ['HC_B', 600],
          ],
          { diners: 30 }
        ),
        block('bB', [['HC_B', 300]], { diners: 30 }),
        block(
          'bZ',
          [
            ['HC_Z', 500],
            ['HC_Y', 1500],
          ],
          { diners: 30, seniors: 40 }
        ),
        ...extraBlocks,
      ]
    );

  it('keeps an isolated centre green next to a far anchor, however much it harms its own area', () => {
    const [card] = evaluatePlan(isolated(), 'HC_A', ['HC_Z'], assumptions).cards;

    expect(card).toMatchObject({ status: 'green', rule: null, cutOff: { blocks: 0, seniors: 0 } });
    expect(card.accessLoss).toEqual({ senior: 0, typical: 0, brisk: 0 });
  });

  it('lists what the isolated centre does on its own under the card, without colouring it', () => {
    const [card] = evaluatePlan(isolated(), 'HC_A', ['HC_Z'], assumptions).cards;

    expect(card.ownProblems).toEqual([
      'Closing Changi on its own leaves 1 more block (40 seniors) with no centre within 15 min at senior pace.',
    ]);
    expect(card.ownImpact).toEqual({ cutOff: { blocks: 1, seniors: 40 }, busier: [] });
  });

  it('shows seniors to the nearest 5, and under 5 as "<5", in that line', () => {
    const own = (seniors: number) =>
      evaluatePlan(
        town(
          [centre('HC_A'), centre('HC_Z'), centre('HC_Y')],
          [
            block(
              'bZ',
              [
                ['HC_Z', 500],
                ['HC_Y', 1500],
              ],
              { seniors }
            ),
          ]
        ),
        'HC_A',
        ['HC_Z'],
        assumptions
      ).cards[0].ownProblems[0];

    expect(own(2123.066)).toContain('leaves 1 more block (2,125 seniors)');
    expect(own(3.4)).toContain('leaves 1 more block (<5 seniors)');
    expect(own(0)).toContain('leaves 1 more block (0 seniors)');
  });

  it('has no own problems for a centre that harms no one by itself', () => {
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], assumptions).cards;

    expect(card.ownProblems).toEqual([]);
  });

  it('is the same wherever the pair is added: the verdict does not depend on the other centre', () => {
    const data = isolated();

    expect(evaluatePlan(data, 'HC_Z', ['HC_A'], assumptions).cards[0].status).toBe('green');
    expect(evaluatePlan(data, 'HC_A', ['HC_Z'], assumptions).cards[0].status).toBe('green');
  });

  it('does not change when the added centre’s own harm changes', () => {
    // The same pair, with an extra block that only Z serves (so Z alone strands it).
    const more = isolated([block('bZ2', [['HC_Z', 300]], { diners: 200, seniors: 60 })]);

    const plain = evaluatePlan(isolated(), 'HC_A', ['HC_Z'], assumptions).cards[0];
    const harmed = evaluatePlan(more, 'HC_A', ['HC_Z'], assumptions).cards[0];

    const verdictOnly = ({
      status,
      rule,
      reason,
      details,
      cutOff,
      shareOfRest,
      overloaded,
      accessLoss,
    }: typeof plain) => ({
      status,
      rule,
      reason,
      details,
      cutOff,
      shareOfRest,
      overloaded,
      accessLoss,
    });
    expect(verdictOnly(harmed)).toEqual(verdictOnly(plain));
    expect(harmed.ownProblems[0]).toContain('leaves 2 more blocks');
  });

  it('is red when the two together cut off a block that neither cuts off alone', () => {
    // bAZ has A at 300 m, then Z at 400 m, then Y at 1,500 m; it is only 1 of the 31 diners A's closure moves.
    const data = isolated([
      block(
        'bAZ',
        [
          ['HC_A', 300],
          ['HC_Z', 400],
          ['HC_Y', 1500],
        ],
        { diners: 1, seniors: 12 }
      ),
    ]);

    const [card] = evaluatePlan(data, 'HC_A', ['HC_Z'], assumptions).cards;

    expect(card).toMatchObject({ status: 'red', rule: 'access', cutOff: { blocks: 1, seniors: 12 } });
  });

  it('is not blamed for a neighbour that the other centre already pushes past the limit by itself', () => {
    // P3 alone makes Q3 (100 diners today) 80% busier. Adding P3 to P0 changes nothing for Q3: it was past 20% alone.
    const data = withBaseline(verdictTown(), 'HC_Q3', 100);

    const [card] = evaluatePlan(data, 'HC_P0', ['HC_P3'], assumptions).cards;

    expect(card).toMatchObject({ status: 'green', overloaded: [] });
    expect(card.ownProblems).toEqual([
      'Closing Centre HC_P3 on its own makes Centre HC_Q3 (80%) more than 20% busier.',
    ]);
  });

  it('two centres with no shared receiving centre are green however near they are', () => {
    const data = town(
      [centre('HC_A'), centre('HC_B'), centre('HC_C'), centre('HC_D')],
      [
        block(
          'b1',
          [
            ['HC_A', 300],
            ['HC_B', 600],
          ],
          { diners: 100 }
        ),
        block(
          'b2',
          [
            ['HC_C', 300],
            ['HC_D', 600],
          ],
          { diners: 100 }
        ),
      ]
    );

    const [card] = evaluatePlan(data, 'HC_A', ['HC_C'], assumptions).cards;

    expect(card).toMatchObject({ status: 'green', reason: 'Too far apart to overlap' });
  });
});

describe('evaluatePlan: totals', () => {
  it('has no receivers, no displaced diners and green cards when nobody uses the closed centres', () => {
    // Q0 and Q1 are only ever a fallback.
    const result = evaluatePlan(verdictTown(), 'HC_Q0', ['HC_Q1'], assumptions);

    expect(result.displacedDinersPerDay).toBe(0);
    expect(result.receivers).toEqual([]);
    expect(result.cards[0]).toMatchObject({ status: 'green', shareOfRest: 0 });
  });

  it('shares the displaced diners out in full', () => {
    const result = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_P0'], assumptions);

    expect(result.receivers.reduce((sum, r) => sum + r.extraDinersPerDay, 0)).toBeCloseTo(result.displacedDinersPerDay);
    expect(result.receivers.reduce((sum, r) => sum + r.shareOfDisplaced, 0)).toBeCloseTo(1);
  });

  it('marks a centre with under 1 diner today as "new", with no %', () => {
    const data = withBaseline(verdictTown(), 'HC_D', 0.5);

    const { receivers } = evaluatePlan(data, 'HC_A', [], assumptions);

    expect(receivers[0]).toMatchObject({ centreId: 'HC_D', pctOverBaseline: 'new' });
  });

  it('names the busiest receiver by %, leaving out "new" ones', () => {
    const { tiles } = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_P0'], assumptions);

    // D: 60 of 400 = 15%; Q0: 50 of 1,000 = 5%.
    expect(tiles.busiest.centre).toMatchObject({ centreId: 'HC_D' });
    expect(tiles.busiest.centre?.pctOverBaseline).toBeCloseTo(15);
    expect(tiles.biggestLoad.centre).toMatchObject({ centreId: 'HC_D', extraDinersPerStall: 6 });
  });
});

describe('evaluatePlan: NEA actions', () => {
  // Diners today: A 1,000, Z 0, B 600, C 300. A centre is flagged above +20% of its diners today.
  const data = town(
    [
      centre('HC_A', { stalls: 10, baseline: 1000 }),
      centre('HC_Z', { stalls: 4, baseline: 0, name: 'Zero Baseline Market' }),
      centre('HC_B', { stalls: 10, baseline: 600, name: 'Busy Centre' }),
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

  it('flags every centre more than 20% busier, including one with no diners today', () => {
    // A alone: Z takes 60 of 0 ("new"), B takes 120 of 600 = 20%, which is not above 20%.
    const { neaActions } = evaluatePlan(data, 'HC_A', [], assumptions);

    expect(neaActions.threshold).toBe(20);
    expect(neaActions.centres).toEqual([{ centreId: 'HC_Z', name: 'Zero Baseline Market', extraDinersPerStall: 15 }]);
  });

  it('lists on a card the centres its closure sends past the flag', () => {
    // A + C: B takes 120 + 40 = 160 of 600, 27% more.
    const result = evaluatePlan(data, 'HC_A', ['HC_C'], assumptions);

    expect(result.neaActions.centres.map((c) => c.centreId)).toEqual(['HC_B', 'HC_Z']);
    expect(result.cards[0].neaActions).toEqual([{ centreId: 'HC_B', name: 'Busy Centre', extraDinersPerStall: 16 }]);
  });

  it('reads the flag from assumptions', () => {
    const { neaActions } = evaluatePlan(data, 'HC_A', ['HC_C'], withValues({ 'actions.waste.flag_pct': 0.3 }));

    expect(neaActions).toMatchObject({ threshold: 30 });
    expect(neaActions.centres.map((c) => c.centreId)).toEqual(['HC_Z']);
  });

  it('never changes the colour', () => {
    // With a tiny flag every receiver needs actions, yet A + P0 stays green.
    const [card] = evaluatePlan(verdictTown(), 'HC_A', ['HC_P0'], withValues({ 'actions.waste.flag_pct': 0.01 })).cards;

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
    // A + B + P0: B pushes D to 15% (yellow); P0 is green. A alone puts D at 5% (green).
    const { plan, tiles, takeaway } = evaluatePlan(verdictTown(), 'HC_A', ['HC_B', 'HC_P0'], assumptions);

    expect(plan).toMatchObject({ status: 'yellow', counts: { red: 0, yellow: 1, green: 1 }, anchorProblems: [] });
    expect(tiles.verdict).toMatchObject({ status: 'yellow', counts: { red: 0, yellow: 1, green: 1 }, tag: 'MODELLED' });
    expect(takeaway.verdict).toEqual({ status: 'yellow', counts: { red: 0, yellow: 1, green: 1 } });
  });

  it('lists problems the anchor causes alone without colouring the plan, which takes the worst card', () => {
    // P3 alone makes Q3 (100 diners today) 80% busier. The only card (P0) is green, so the plan is green.
    const data = withBaseline(verdictTown(), 'HC_Q3', 100);

    const { plan } = evaluatePlan(data, 'HC_P3', ['HC_P0'], assumptions);

    expect(plan.status).toBe('green');
    expect(plan.counts).toEqual({ red: 0, yellow: 0, green: 1 });
    expect(plan.anchorProblems).toEqual([
      'Closing Centre HC_P3 on its own makes Centre HC_Q3 (80%) more than 20% busier.',
    ]);
  });

  it('lists every rule the anchor breaks on its own, not just the first', () => {
    // bP3x has only P3 within 900 m (fallback Q3 at 1,200 m). P3 alone: Q3 takes 90 of its 100 diners.
    const data = withBaseline(
      verdictTown([
        block(
          'bP3x',
          [
            ['HC_P3', 400],
            ['HC_Q3', 1200],
          ],
          { diners: 10 }
        ),
      ]),
      'HC_Q3',
      100
    );

    const { plan } = evaluatePlan(data, 'HC_P3', [], assumptions);

    expect(plan.anchorProblems).toEqual([
      'Closing Centre HC_P3 on its own leaves 1 more block (20 seniors) with no centre within 15 min at senior pace.',
      'Closing Centre HC_P3 on its own makes Centre HC_Q3 (90%) more than 20% busier.',
    ]);
  });

  it('has no plan colour when only the anchor is chosen', () => {
    const { plan, cards, tiles } = evaluatePlan(verdictTown(), 'HC_A', [], assumptions);

    expect(cards).toEqual([]);
    expect(plan).toMatchObject({ status: null, counts: { red: 0, yellow: 0, green: 0 }, anchorProblems: [] });
    expect(tiles.verdict.status).toBeNull();
  });
});
