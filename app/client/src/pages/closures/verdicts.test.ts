import { describe, expect, test } from 'vitest';
import type { VerdictCard } from '@shared/closure-engine';
import { cardView, planLineView } from './verdicts';

const red: VerdictCard = {
  centreId: 'C2',
  name: 'Toa Payoh West Market and Food Centre',
  status: 'red',
  rule: 'load',
  reason: 'Closing Toa Payoh West Market and Food Centre too pushes Bishan North to 130.2 extra diners per stall.',
  cutOff: { blocks: 0, seniors: 0 },
  pastBenchmark: [],
  shareOfDisplaced: 0.214,
  pushes: [
    {
      centreId: 'C5',
      name: 'Bishan North Market and Food Centre',
      extraDinersPerStall: 130.24,
      withoutThisCentre: 61.5,
    },
    { centreId: 'C6', name: 'Toa Payoh Lorong 8 Blk 210', extraDinersPerStall: 12.0, withoutThisCentre: 8.04 },
  ],
  accessLoss: { senior: 2, typical: 1, brisk: 0 },
  neaActions: [{ centreId: 'C5', name: 'Bishan North Market and Food Centre', extraDinersPerStall: 130.24 }],
  possiblyUndercounted: false,
  overlaps: [
    {
      withCentreId: 'C7',
      withName: 'Lorong 8 Toa Payoh Market and Food Centre',
      own: { type: 'renovation', startDate: '2026-09-14', endDate: '2026-12-13' },
      other: { type: 'redevelopment', startDate: '2026-12-01', endDate: '2027-03-31' },
    },
  ],
};

describe('cardView', () => {
  test('a red card: icon, word and colour, the reason, NEA actions, overlap note and Read more', () => {
    expect(cardView(red, 15)).toEqual({
      centreId: 'C2',
      name: 'Toa Payoh West',
      status: 'red',
      icon: '✕',
      word: 'Do not close together',
      tone: 'red',
      reason: red.reason,
      possiblyUndercounted: false,
      neaActions:
        'NEA actions: extra bins, more frequent collection and extra cleaning checks at Bishan North (+130.2 extra diners per stall).',
      overlaps: [
        'Its renovation (14 Sep – 13 Dec 2026) overlaps Lorong 8 Toa Payoh’s redevelopment (1 Dec 2026 – 31 Mar 2027).',
      ],
      readMore: {
        share: '21% of the plan’s displaced diners have it as their nearest centre',
        pushes: [
          'Bishan North: +130.2 extra diners per stall (+61.5 if it stays open)',
          'Toa Payoh Lorong 8 Blk 210: +12.0 extra diners per stall (+8.0 if it stays open)',
        ],
        accessLoss:
          '2 · 1 · 0 blocks lose a centre within 15 min at senior · typical · brisk pace because it closes too',
      },
    });
  });

  test('yellow and green cards, with nothing to act on', () => {
    const quiet = { ...red, neaActions: [], overlaps: [], pushes: [], accessLoss: { senior: 0, typical: 0, brisk: 0 } };
    expect(cardView({ ...quiet, status: 'yellow' }, 15)).toMatchObject({
      icon: '!',
      word: 'Close with caution',
      tone: 'yellow',
      neaActions: null,
      overlaps: [],
      readMore: { pushes: [], accessLoss: 'No block loses a centre within 15 min because it closes too' },
    });
    expect(cardView({ ...quiet, status: 'green' }, 15)).toMatchObject({
      icon: '✓',
      word: 'Safe to close together',
      tone: 'green',
    });
  });

  test('NEA actions name every centre past the threshold', () => {
    const two = {
      ...red,
      neaActions: [
        { centreId: 'C5', name: 'Bishan North Market and Food Centre', extraDinersPerStall: 130.24 },
        { centreId: 'C6', name: 'Toa Payoh Lorong 8 Blk 210', extraDinersPerStall: 40.06 },
      ],
    };
    expect(cardView(two, 15).neaActions).toBe(
      'NEA actions: extra bins, more frequent collection and extra cleaning checks at Bishan North (+130.2 extra diners per stall) and Toa Payoh Lorong 8 Blk 210 (+40.1).'
    );
  });
});

describe('planLineView', () => {
  test('coloured by the worst card, with the counts and what the anchor causes on its own', () => {
    const line = planLineView({
      status: 'red',
      counts: { red: 1, yellow: 2, green: 0 },
      anchorProblems: ['Closing Kim Keat Palm on its own pushes X to 162.1 extra diners per stall.'],
    });
    expect(line).toEqual({
      status: 'red',
      icon: '✕',
      word: 'Do not close together',
      tone: 'red',
      counts: '1 red · 2 yellow · 0 green',
      anchorProblems: ['Closing Kim Keat Palm on its own pushes X to 162.1 extra diners per stall.'],
    });
  });

  test('no line while only the anchor is chosen', () => {
    expect(planLineView({ status: null, counts: { red: 0, yellow: 0, green: 0 }, anchorProblems: ['x'] })).toBeNull();
  });
});
