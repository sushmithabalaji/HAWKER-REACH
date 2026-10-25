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
  ownImpact: { cutOff: { blocks: 0, seniors: 0 }, busier: [] },
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
  test('a red card: icon, word and colour, the reason, and Read more as key numbers and sections', () => {
    expect(cardView(red, 15)).toEqual({
      centreId: 'C2',
      name: 'Toa Payoh West',
      status: 'red',
      icon: '✕',
      word: 'Do not close together',
      tone: 'red',
      reason: red.reason,
      possiblyUndercounted: false,
      details: {
        share: '21%',
        seniorBlocks: 2,
        busiest: { name: 'Bishan North', pct: '+28%' },
        pushes: [
          { name: 'Bishan North', together: '+28%', apart: '+12%' },
          { name: 'Toa Payoh Lorong 8 Blk 210', together: '+12%', apart: '+8%' },
        ],
        accessLoss: [
          { pace: 'Senior', blocks: 2 },
          { pace: 'Typical', blocks: 1 },
          { pace: 'Brisk', blocks: 0 },
        ],
        neaActions: ['Bishan North · +130.2 extra diners per stall'],
        overlaps: [
          'Its renovation (14 Sep – 13 Dec 2026) overlaps Lorong 8 Toa Payoh’s redevelopment (1 Dec 2026 – 31 Mar 2027).',
        ],
        onItsOwn: [],
      },
    });
  });

  test('on its own: one short point for the blocks cut off and one per centre made busier', () => {
    const harmful = {
      ...red,
      ownImpact: {
        cutOff: { blocks: 3, seniors: 47 },
        busier: [{ centreId: 'C5', name: 'Bishan North Market and Food Centre', pct: 31.6 }],
      },
    };
    expect(cardView(harmful, 15).details.onItsOwn).toEqual([
      '3 blocks (45 seniors) left with no centre within 15 min',
      'Bishan North +32% busier',
    ]);
  });

  test('yellow and green cards, with nothing to act on', () => {
    const quiet = { ...red, neaActions: [], overlaps: [], pushes: [], accessLoss: { senior: 0, typical: 0, brisk: 0 } };
    expect(cardView({ ...quiet, status: 'yellow' }, 15)).toMatchObject({
      icon: '!',
      word: 'Close with caution',
      tone: 'yellow',
      details: { busiest: null, pushes: [], neaActions: [], overlaps: [], seniorBlocks: 0 },
    });
    expect(cardView({ ...quiet, status: 'green' }, 15)).toMatchObject({
      icon: '✓',
      word: 'Safe to close together',
      tone: 'green',
    });
  });

  test('NEA actions list every centre past the flag, and one with no stalls by name only', () => {
    const two = {
      ...red,
      neaActions: [
        { centreId: 'C5', name: 'Bishan North Market and Food Centre', extraDinersPerStall: 130.24 },
        { centreId: 'C6', name: 'Toa Payoh Lorong 8 Blk 210', extraDinersPerStall: null },
      ],
    };
    expect(cardView(two, 15).details.neaActions).toEqual([
      'Bishan North · +130.2 extra diners per stall',
      'Toa Payoh Lorong 8 Blk 210',
    ]);
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
