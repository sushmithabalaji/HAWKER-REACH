import { describe, expect, test } from 'vitest';
import type { Candidate } from '@shared/closure-engine';
import { candidateRowView } from './scheduleView';

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  centreId: 'C1',
  name: 'Toa Payoh West Market and Food Centre',
  lastRR: '2025-08-31',
  dueForRR: false,
  seniorsCutOff: 0,
  dinersDisplacedPerDay: 2384,
  cleaning: [],
  ...over,
});
const checked = { recordsFrom: 2024, overlapChecked: true };

describe('candidateRowView', () => {
  test('diners to the nearest 10, under 5 as "<10"', () => {
    expect(candidateRowView(candidate({ dinersDisplacedPerDay: 3 }), checked).dinersDisplaced).toBe('<10');
  });

  test('short name, last R&R as month and year, diners to the nearest 10', () => {
    expect(candidateRowView(candidate(), checked)).toEqual({
      centreId: 'C1',
      name: 'Toa Payoh West',
      lastRR: 'Aug 2025',
      seniorsCutOff: '0',
      dinersDisplaced: '2,380',
      closuresInWindow: 'None',
    });
  });

  test('seniors cut off to the nearest 5, under 5 as "<5"', () => {
    expect(
      [0, 3, 23, 1234].map((n) => candidateRowView(candidate({ seniorsCutOff: n }), checked).seniorsCutOff)
    ).toEqual(['0', '<5', '25', '1,235']);
  });

  test('no R&R on record reads from the year the records start', () => {
    expect(candidateRowView(candidate({ lastRR: null }), checked).lastRR).toBe('Not since 2024');
    expect(candidateRowView(candidate({ lastRR: null }), { ...checked, recordsFrom: null }).lastRR).toBe(
      'Not on record'
    );
  });

  test('cleaning in the window counts its days; no window reads "—"', () => {
    const cleaning = [
      { startDate: '2026-10-05', endDate: '2026-10-06' },
      { startDate: '2026-11-02', endDate: '2026-11-02' },
    ];

    expect(candidateRowView(candidate({ cleaning }), checked).closuresInWindow).toBe('3 cleaning days');
    expect(candidateRowView(candidate({ cleaning: cleaning.slice(1) }), checked).closuresInWindow).toBe(
      '1 cleaning day'
    );
    expect(candidateRowView(candidate(), { ...checked, overlapChecked: false }).closuresInWindow).toBe('—');
  });
});
