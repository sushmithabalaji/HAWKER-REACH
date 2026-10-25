import { describe, expect, it } from 'vitest';
import { evaluatePlan } from '.';
import { assumptions, block, centre, town, withValues } from './sample';

// Baselines per stall: A 100, B 1,000, C 100, so a typical centre has 100 and the flag is 20 extra diners per stall.
const data = town(
  [centre('HC_A'), centre('HC_B', { stalls: 1, name: 'Tiny Stall Row' }), centre('HC_C', { name: 'Big Centre' })],
  [
    block(
      'B1',
      [
        ['HC_A', 300],
        ['HC_B', 700],
      ],
      { diners: 40 }
    ),
    block(
      'B2',
      [
        ['HC_A', 400],
        ['HC_C', 600],
      ],
      { diners: 25 }
    ),
  ]
);
const kg = {
  'waste.kg_per_diner_per_day.low': 0.05,
  'waste.kg_per_diner_per_day.base': 0.1,
  'waste.kg_per_diner_per_day.high': 0.2,
};

describe('evaluatePlan: demand and waste', () => {
  it('lists every receiving centre with its diners, load and waste', () => {
    const { demandWaste } = evaluatePlan(data, 'HC_A', [], withValues(kg));

    expect(demandWaste.rows).toEqual([
      {
        centreId: 'HC_B',
        name: 'Tiny Stall Row',
        baselineDinersPerDay: 1000,
        extraDinersPerDay: 40,
        extraDinersPerStall: 40,
        pctOverBaseline: 4,
        flagged: true,
        extraWasteKgPerDay: 4,
        possiblyUndercounted: false,
      },
      {
        centreId: 'HC_C',
        name: 'Big Centre',
        baselineDinersPerDay: 1000,
        extraDinersPerDay: 25,
        extraDinersPerStall: 2.5,
        pctOverBaseline: 2.5,
        flagged: false,
        extraWasteKgPerDay: 2.5,
        possiblyUndercounted: false,
      },
    ]);
    expect(demandWaste.threshold).toBe(20);
  });

  it('flags the same centres as the NEA actions line', () => {
    const result = evaluatePlan(data, 'HC_A', [], assumptions);

    expect(result.demandWaste.rows.filter((r) => r.flagged).map((r) => r.centreId)).toEqual(
      result.neaActions.centres.map((c) => c.centreId)
    );
    expect(result.demandWaste.threshold).toBe(result.neaActions.threshold);
  });

  it('puts flagged centres first, then the heaviest load per stall', () => {
    const crowded = town(
      [centre('HC_A'), centre('HC_B'), centre('HC_C'), centre('HC_D')],
      [
        block(
          'B1',
          [
            ['HC_A', 100],
            ['HC_B', 200],
          ],
          { diners: 30 }
        ),
        block(
          'B2',
          [
            ['HC_A', 100],
            ['HC_C', 200],
          ],
          { diners: 100 }
        ),
        block(
          'B3',
          [
            ['HC_A', 100],
            ['HC_D', 200],
          ],
          { diners: 250 }
        ),
      ]
    );

    const { rows } = evaluatePlan(crowded, 'HC_A', [], assumptions).demandWaste;

    expect(rows.map((r) => [r.centreId, r.flagged])).toEqual([
      ['HC_D', true],
      ['HC_C', false],
      ['HC_B', false],
    ]);
  });

  it('is not limited to the top 5 receivers', () => {
    const ids = ['HC_B', 'HC_C', 'HC_D', 'HC_E', 'HC_F', 'HC_G', 'HC_H'];
    const wide = town(
      [centre('HC_A'), ...ids.map((id) => centre(id))],
      ids.map((id, i) =>
        block(
          `B${i}`,
          [
            ['HC_A', 100],
            [id, 200],
          ],
          { diners: 10 }
        )
      )
    );

    expect(evaluatePlan(wide, 'HC_A', [], assumptions).demandWaste.rows).toHaveLength(7);
  });

  it('adds up waste for the plan as a low, base and high total', () => {
    const { totalKgPerDay } = evaluatePlan(data, 'HC_A', [], withValues(kg)).demandWaste;

    // 65 extra diners per day; visits per week 1 / 3 / 5 scale diners by 1/3, 1 and 5/3.
    expect(totalKgPerDay.base).toBeCloseTo(6.5);
    expect(totalKgPerDay.low).toBeCloseTo(65 * (1 / 3) * 0.05);
    expect(totalKgPerDay.high).toBeCloseTo(65 * (5 / 3) * 0.2);
  });

  it('counts only diners who move, not newly unserved ones', () => {
    const stranded = town(
      [centre('HC_A'), centre('HC_B')],
      [
        block(
          'B1',
          [
            ['HC_A', 100],
            ['HC_B', 200],
          ],
          { diners: 30 }
        ),
        block('B2', [['HC_A', 100]], { diners: 70 }),
      ]
    );

    const { rows, totalKgPerDay } = evaluatePlan(stranded, 'HC_A', [], withValues(kg)).demandWaste;

    expect(rows.map((r) => r.extraDinersPerDay)).toEqual([30]);
    expect(totalKgPerDay.base).toBeCloseTo(3);
  });

  it('shows "new" and a zero baseline for a centre with no modelled diners', () => {
    const empty = town(
      [centre('HC_A'), centre('HC_Z', { baseline: 0 })],
      [
        block(
          'B1',
          [
            ['HC_A', 100],
            ['HC_Z', 200],
          ],
          { diners: 15 }
        ),
      ]
    );

    const [row] = evaluatePlan(empty, 'HC_A', [], assumptions).demandWaste.rows;

    expect(row.baselineDinersPerDay).toBe(0);
    expect(row.pctOverBaseline).toBe('new');
  });

  it('carries the under-count marker', () => {
    const under = town(
      [centre('HC_A'), centre('HC_B', { undercounted: true })],
      [
        block('B1', [
          ['HC_A', 100],
          ['HC_B', 200],
        ]),
      ]
    );

    expect(evaluatePlan(under, 'HC_A', [], assumptions).demandWaste.rows[0].possiblyUndercounted).toBe(true);
  });

  it('has no rows and no waste when a closure moves nobody', () => {
    const none = town([centre('HC_A'), centre('HC_B')], [block('B1', [['HC_B', 100]])]);

    const { rows, totalKgPerDay } = evaluatePlan(none, 'HC_A', [], assumptions).demandWaste;

    expect(rows).toEqual([]);
    expect(totalKgPerDay).toEqual({ low: 0, base: 0, high: 0 });
  });

  it('reads the waste figure and visit range from assumptions', () => {
    const { totalKgPerDay } = evaluatePlan(
      data,
      'HC_A',
      [],
      withValues({ ...kg, 'waste.kg_per_diner_per_day.base': 0.3, 'diners.visits_per_week.max': 6 })
    ).demandWaste;

    expect(totalKgPerDay.base).toBeCloseTo(19.5);
    expect(totalKgPerDay.high).toBeCloseTo(65 * (6 / 3) * 0.2);
  });
});
