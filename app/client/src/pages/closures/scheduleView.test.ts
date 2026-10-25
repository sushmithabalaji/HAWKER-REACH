import { describe, expect, test } from 'vitest';
import type { Candidate } from '@shared/closure-engine';
import { candidateRowView } from './scheduleView';

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  centreId: 'C1',
  name: 'Toa Payoh West Market and Food Centre',
  distanceM: 1234.5,
  openingYear: 1975,
  ageYears: 51,
  status: 'green',
  reason: 'Closing Toa Payoh West too cuts no one off.',
  cleaning: [],
  ...over,
});

describe('candidateRowView', () => {
  test('a green candidate: short name, distance in km, age and the verdict', () => {
    expect(candidateRowView(candidate())).toEqual({
      centreId: 'C1',
      name: 'Toa Payoh West',
      status: 'green',
      icon: '✓',
      word: 'Safe to close together',
      reason: 'Closing Toa Payoh West too cuts no one off.',
      distance: '1.2 km',
      opened: '1975 (51 years ago)',
      cleaningNotes: [],
    });
  });

  test('a yellow candidate keeps its reason and its own mark', () => {
    expect(candidateRowView(candidate({ status: 'yellow', reason: 'It pushes Dover.' }))).toMatchObject({
      status: 'yellow',
      icon: '!',
      word: 'Close with caution',
      reason: 'It pushes Dover.',
    });
  });

  test('opened reads as the year and a year count, "this year", or unknown', () => {
    expect(candidateRowView(candidate({ openingYear: 2025, ageYears: 1 })).opened).toBe('2025 (1 year ago)');
    expect(candidateRowView(candidate({ openingYear: 2026, ageYears: 0 })).opened).toBe('2026 (this year)');
    expect(candidateRowView(candidate({ openingYear: null, ageYears: null })).opened).toBe('Unknown');
  });

  test('a cleaning closure in the window becomes a note', () => {
    const row = candidateRowView(candidate({ cleaning: [{ startDate: '2026-10-05', endDate: '2026-10-06' }] }));

    expect(row.cleaningNotes).toEqual(['Cleaning 5 Oct – 6 Oct 2026']);
  });
});
