import { describe, expect, test } from 'vitest';
import type { VerdictCard } from '@shared/closure-engine';
import { cardView, planLineView } from './verdicts';

const red: VerdictCard = {
  centreId: 'C2',
  name: 'Toa Payoh West Market and Food Centre',
  status: 'red',
  rule: 'load',
  reason: 'Bishan North Market and Food Centre gets 28% busier',
  details: ['Bishan North Market and Food Centre would get 28% busier'],
  cutOff: { blocks: 0, seniors: 0 },
  shareOfRest: 0,
  overloaded: [],
  shareOfDisplaced: 0.214,
  pushes: [
    { centreId: 'C5', name: 'Bishan North Market and Food Centre', pct: 28.4, ifApart: 12.3 },
    { centreId: 'C6', name: 'Toa Payoh Lorong 8 Blk 210', pct: 12.0, ifApart: 8.04 },
  ],
  accessLoss: { senior: 2, typical: 1, brisk: 0 },
  ownProblems: [],
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
      ownProblems: [],
      neaActions:
        'NEA actions: extra bins, more frequent collection and extra cleaning checks at Bishan North (+130.2 extra diners per stall).',
      overlaps: [
        'Its renovation (14 Sep – 13 Dec 2026) overlaps Lorong 8 Toa Payoh’s redevelopment (1 Dec 2026 – 31 Mar 2027).',
      ],
      readMore: {
        share: '21% of the plan’s displaced diners have it as their nearest centre',
        pushes: [
          'Bishan North: 28% busier (12% if closed separately)',
          'Toa Payoh Lorong 8 Blk 210: 12% busier (8% if closed separately)',
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
