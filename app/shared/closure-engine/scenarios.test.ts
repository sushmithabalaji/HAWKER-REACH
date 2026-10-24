import { describe, expect, it } from 'vitest';
import { checkScenarios, type ClosureScenarioRow } from './scenarios';
import { assumptions, block, centre, town } from './sample';

// A closes; its blocks move to B (10 stalls) and C (20 stalls). B takes 72 diners a day (7.2 per stall,
// 7.2% of its 1,000), C takes 36 (1.8 per stall). bA3 has no other centre within 2 km, and bA1 loses
// its only centre within 900 m.
const data = town(
  [centre('HC_A'), centre('HC_B'), centre('HC_C', { stalls: 20 })],
  [
    block(
      'bA1',
      [
        ['HC_A', 500],
        ['HC_B', 1000],
      ],
      { diners: 72, seniors: 12 }
    ),
    block(
      'bA2',
      [
        ['HC_A', 300],
        ['HC_C', 600],
      ],
      { diners: 36, seniors: 4 }
    ),
    block('bA3', [['HC_A', 1500]], { residents: 50, diners: 18, seniors: 9 }),
    block('bB1', [['HC_B', 200]]),
  ]
);

const goldMatchingEngine: ClosureScenarioRow = {
  centre_id: 'HC_A',
  worst_neighbour_id: 'HC_B',
  worst_neighbour_extra_per_stall: 7.2,
  worst_neighbour_pct: 7.2,
  unserved_residents: 50,
  seniors_lost_walk: 12,
};

describe('checkScenarios', () => {
  it('finds no mismatch when gold agrees with the engine within 0.01', () => {
    expect(
      checkScenarios(data, [{ ...goldMatchingEngine, worst_neighbour_extra_per_stall: 7.205 }], assumptions)
    ).toEqual([]);
  });

  it('lists each field that disagrees, with the centre, the engine value and the gold value', () => {
    const wrong = { ...goldMatchingEngine, worst_neighbour_id: 'HC_C', unserved_residents: 49.9 };
    expect(checkScenarios(data, [wrong], assumptions)).toEqual([
      { centreId: 'HC_A', field: 'worst_neighbour_id', engine: 'HC_B', gold: 'HC_C' },
      { centreId: 'HC_A', field: 'unserved_residents', engine: 50, gold: 49.9 },
    ]);
  });

  it('an empty value on one side and a number on the other is a mismatch', () => {
    const emptyPct = { ...goldMatchingEngine, worst_neighbour_pct: null };
    expect(checkScenarios(data, [emptyPct], assumptions)).toEqual([
      { centreId: 'HC_A', field: 'worst_neighbour_pct', engine: expect.closeTo(7.2) as number, gold: null },
    ]);
  });

  it('an empty % in gold matches a neighbour with no baseline, and no worst neighbour matches a closure that moves no one', () => {
    const empty = town(
      [centre('HC_D'), centre('HC_E', { baseline: 0 }), centre('HC_F')],
      [
        block(
          'bD1',
          [
            ['HC_D', 400],
            ['HC_E', 700],
          ],
          { diners: 30, seniors: 0 }
        ),
      ]
    );
    const rows: ClosureScenarioRow[] = [
      {
        centre_id: 'HC_D',
        worst_neighbour_id: 'HC_E',
        worst_neighbour_extra_per_stall: 3,
        worst_neighbour_pct: null,
        unserved_residents: 0,
        seniors_lost_walk: 0,
      },
      {
        centre_id: 'HC_F',
        worst_neighbour_id: null,
        worst_neighbour_extra_per_stall: null,
        worst_neighbour_pct: null,
        unserved_residents: 0,
        seniors_lost_walk: 0,
      },
    ];
    expect(checkScenarios(empty, rows, assumptions)).toEqual([]);
  });
});
