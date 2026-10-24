import { describe, expect, test } from 'vitest';
import type { TakeawayParts } from '@shared/closure-engine';
import { takeawaySentence } from './takeaway';

const limits = { limitMin: 15, cutoffM: 2000 };

const anchorAlone: TakeawayParts = {
  closedCentreNames: ['Toa Payoh Lorong 7 Blk 22 (Kim Keat Palm Market and Food Centre)'],
  displacedDinersPerDay: 1230,
  receiverCount: 6,
  topReceiver: { name: 'Toa Payoh West Market and Food Centre', shareOfDisplaced: 0.344 },
  unservedResidents: 124,
  seniorBlocksLosingAccess: 3,
  verdict: { status: null, counts: { red: 0, yellow: 0, green: 0 } },
};

describe('takeawaySentence', () => {
  test('an anchor alone: where its diners go and who is cut off', () => {
    expect(takeawaySentence(anchorAlone, limits)).toBe(
      'Closing Kim Keat Palm sends about 1,230 diners a day to 6 other centres; Toa Payoh West takes the most (34%). ' +
        'About 120 residents are left with no centre within 2 km, and 3 blocks lose a centre within 15 min at senior pace.'
    );
  });

  test('no one cut off', () => {
    const parts = { ...anchorAlone, unservedResidents: 0, seniorBlocksLosingAccess: 0 };
    expect(takeawaySentence(parts, limits)).toMatch(
      /takes the most \(34%\)\. Every block keeps a centre within 15 min at senior pace\.$/
    );
  });

  test('only one kind of cut-off', () => {
    expect(takeawaySentence({ ...anchorAlone, seniorBlocksLosingAccess: 0 }, limits)).toMatch(
      /\(34%\)\. About 120 residents are left with no centre within 2 km\.$/
    );
    expect(takeawaySentence({ ...anchorAlone, unservedResidents: 0, seniorBlocksLosingAccess: 1 }, limits)).toMatch(
      /\(34%\)\. 1 block loses a centre within 15 min at senior pace\.$/
    );
  });

  test('one receiving centre is named, not ranked', () => {
    const parts = {
      ...anchorAlone,
      receiverCount: 1,
      topReceiver: { name: 'Kallang Estate Fresh', shareOfDisplaced: 1 },
    };
    expect(takeawaySentence(parts, limits)).toMatch(
      /^Closing Kim Keat Palm sends about 1,230 diners a day to Kallang Estate Fresh\. About/
    );
  });

  test('a closure that displaces no modelled diners says why', () => {
    const parts: TakeawayParts = {
      ...anchorAlone,
      closedCentreNames: ['Amoy Street Food Centre'],
      displacedDinersPerDay: 0,
      receiverCount: 0,
      topReceiver: null,
      unservedResidents: 0,
      seniorBlocksLosingAccess: 0,
    };
    expect(takeawaySentence(parts, limits)).toBe(
      'Closing Amoy Street Food Centre displaces no modelled diners: no HDB block has it as its nearest centre.'
    );
  });

  test('a plan with added centres names them all and ends with the verdict summary', () => {
    const parts: TakeawayParts = {
      ...anchorAlone,
      closedCentreNames: [
        'Toa Payoh Lorong 7 Blk 22 (Kim Keat Palm Market and Food Centre)',
        'Toa Payoh West Market and Food Centre',
        'Lorong 8 Toa Payoh Market and Food Centre',
      ],
      topReceiver: { name: 'Bishan North Market and Food Centre', shareOfDisplaced: 0.21 },
      unservedResidents: 0,
      seniorBlocksLosingAccess: 0,
      verdict: { status: 'red', counts: { red: 1, yellow: 1, green: 0 } },
    };
    expect(takeawaySentence(parts, limits)).toBe(
      'Closing Kim Keat Palm, Toa Payoh West and Lorong 8 Toa Payoh sends about 1,230 diners a day to 6 other centres; ' +
        'Bishan North takes the most (21%). Every block keeps a centre within 15 min at senior pace. ' +
        '1 of the 2 added centres should not close at the same time, and 1 needs caution.'
    );
  });

  test('the verdict summary for one added centre, and for a plan with nothing red', () => {
    const ending = (counts: TakeawayParts['verdict']['counts']) =>
      takeawaySentence({ ...anchorAlone, verdict: { status: 'green', counts } }, limits).split('pace. ')[1];
    expect(ending({ red: 1, yellow: 0, green: 0 })).toBe('The added centre should not close at the same time.');
    expect(ending({ red: 0, yellow: 1, green: 0 })).toBe('The added centre can close at the same time, with caution.');
    expect(ending({ red: 0, yellow: 0, green: 1 })).toBe('The added centre is safe to close at the same time.');
    expect(ending({ red: 0, yellow: 0, green: 3 })).toBe('All 3 added centres are safe to close at the same time.');
    expect(ending({ red: 0, yellow: 2, green: 1 })).toBe(
      'None of the 3 added centres has to stay open, and 2 need caution.'
    );
    expect(ending({ red: 2, yellow: 0, green: 1 })).toBe('2 of the 3 added centres should not close at the same time.');
  });
});
