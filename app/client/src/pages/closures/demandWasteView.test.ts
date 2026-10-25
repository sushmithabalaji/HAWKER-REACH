import { describe, expect, test } from 'vitest';
import type { DemandWaste } from '@shared/closure-engine';
import { demandWasteView } from './demandWasteView';

const row = (over: Partial<DemandWaste['rows'][number]> = {}): DemandWaste['rows'][number] => ({
  centreId: 'C1',
  name: 'Toa Payoh West Market and Food Centre',
  baselineDinersPerDay: 3130.7,
  extraDinersPerDay: 412.3,
  extraDinersPerStall: 4.16,
  pctOverBaseline: 13.2,
  flagged: false,
  extraWasteKgPerDay: 82.46,
  possiblyUndercounted: false,
  ...over,
});

const waste = (rows: DemandWaste['rows'], base = 82.46): DemandWaste => ({
  rows,
  threshold: 20,
  totalKgPerDay: { low: base * 0.3, base, high: base * 3 },
});

describe('demandWasteView', () => {
  test('formats a row: diners to the nearest 10, load to one decimal, waste to whole kg', () => {
    const view = demandWasteView(waste([row()]));

    expect(view.rows).toEqual([
      {
        centreId: 'C1',
        name: 'Toa Payoh West',
        baseline: '3,130',
        extraDiners: '410',
        perStall: '+4.2',
        pctOverBaseline: '+13%',
        flagged: false,
        wasteKg: '82',
        possiblyUndercounted: false,
      },
    ]);
  });

  test('a small take-up reads "<10" and a centre with no stalls shows a dash', () => {
    const [r] = demandWasteView(
      waste([row({ extraDinersPerDay: 3, extraDinersPerStall: null, extraWasteKgPerDay: 0.6 })])
    ).rows;

    expect(r.extraDiners).toBe('<10');
    expect(r.perStall).toBe('—');
    expect(r.wasteKg).toBe('0.6');
  });

  test('a centre with no baseline is "new"', () => {
    expect(demandWasteView(waste([row({ pctOverBaseline: 'new', baselineDinersPerDay: 0 })])).rows[0]).toMatchObject({
      baseline: '0',
      pctOverBaseline: 'new',
    });
  });

  test('the plan total shows the base case and its range', () => {
    const view = demandWasteView(waste([row()], 100));

    expect(view.totalBase).toBe('≈100 kg a day');
    expect(view.totalRange).toBe('30–300 kg a day');
  });

  test('counts flagged centres', () => {
    expect(demandWasteView(waste([row({ flagged: true }), row({ centreId: 'C2' })])).flaggedCount).toBe(1);
  });
});
