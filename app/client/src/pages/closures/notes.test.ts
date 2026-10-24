import { describe, expect, test } from 'vitest';
import { medianResidentsPerStall, undercountNotes, undercountReason, worstCaseNote } from './notes';

describe('medianResidentsPerStall', () => {
  test('the median over centres with a value, interpolating between the middle two', () => {
    const rows = [100, 300, 200, 400].map((r) => ({ residents_per_stall: r }));
    expect(medianResidentsPerStall([...rows, { residents_per_stall: NaN }])).toBe(250);
  });
});

describe('undercountReason', () => {
  test("gives the centre's residents per stall against the threshold and the median", () => {
    expect(undercountReason(12.4, 1850.2, 0.1)).toBe(
      '12 HDB residents per stall, below 0.1 × the median of 1,850 (185). Its diners may be mostly workers, visitors or private-housing residents, whom the model doesn’t count.'
    );
  });
});

describe('undercountNotes', () => {
  test('a note for each possibly under-counted centre only, against the median of all centres', () => {
    const notes = undercountNotes(
      [
        { centre_id: 'A', residents_per_stall: 10, possibly_undercounted: true },
        { centre_id: 'B', residents_per_stall: 200, possibly_undercounted: false },
        { centre_id: 'C', residents_per_stall: 400, possibly_undercounted: false },
      ],
      0.1
    );
    expect([...notes.keys()]).toEqual(['A']);
    expect(notes.get('A')).toBe(undercountReason(10, 200, 0.1));
  });
});

describe('worstCaseNote', () => {
  test('only for a rise above +100%', () => {
    expect(worstCaseNote(100)).toBeNull();
    expect(worstCaseNote('new')).toBeNull();
    expect(worstCaseNote(263)).toBe(
      'A worst case: whole blocks move to their next-nearest centre together, so the real rise is likely smaller.'
    );
  });
});
