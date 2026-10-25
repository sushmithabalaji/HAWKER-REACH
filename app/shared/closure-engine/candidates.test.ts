import { describe, expect, it } from 'vitest';
import { findCandidates } from './candidates';
import type { CentreClosureRow, GoldData } from './gold';
import { assumptions, verdictTown, withValues } from './sample';

const KM_PER_DEGREE = 111.19;
const NOW = 2026;

// The verdictTown centres put on a line east of the anchor, `km` from it; years are opening years.
function placed(
  km: Record<string, number>,
  years: Record<string, number | null> = {},
  closures: CentreClosureRow[] = []
): GoldData {
  const data = verdictTown();
  return {
    ...data,
    centres: data.centres.map((c) => ({
      ...c,
      lon: c.centre_id === 'HC_A' ? 103.8 : 103.8 + (km[c.centre_id] ?? 50) / KM_PER_DEGREE,
      lat: 1.35,
      opening_year: years[c.centre_id] ?? null,
    })),
    centreClosures: closures,
  };
}

// Here B and C are yellow if added to the anchor, D is red (it is block bA's only fallback), and P0, Q0 and Q1 are green (P1 would be yellow).
const NEAR = { HC_B: 0.5, HC_C: 1, HC_P0: 1.5, HC_Q0: 1.6, HC_Q1: 1.7, HC_D: 1.8 };
const ids = (r: { candidates: { centreId: string }[] }) => r.candidates.map((c) => c.centreId);

function closure(centre: string, type: CentreClosureRow['type'], start: string, end: string): CentreClosureRow {
  return {
    closure_id: `${centre}-${type}-${start}`,
    centre_id: centre,
    type,
    start_date: start,
    end_date: end,
    duration_days: 90,
    remarks: null,
  };
}

describe('findCandidates', () => {
  it('lists green centres first, oldest first, then nearest, with no opening year last', () => {
    const data = placed(NEAR, { HC_P0: 1990, HC_Q0: 1975, HC_Q1: null });

    const result = findCandidates(data, 'HC_A', [], null, NOW, withValues({ 'candidates.max_shown': 3 }));

    expect(ids(result)).toEqual(['HC_Q0', 'HC_P0', 'HC_Q1']);
    expect(result.candidates[0]).toMatchObject({ status: 'green', openingYear: 1975, ageYears: 51 });
    expect(result.candidates[2]).toMatchObject({ openingYear: null, ageYears: null });
  });

  it('breaks an age tie on distance', () => {
    const data = placed(NEAR, { HC_P0: 1980, HC_Q0: 1980, HC_Q1: 1980 });

    expect(ids(findCandidates(data, 'HC_A', [], null, NOW, withValues({ 'candidates.max_shown': 3 })))).toEqual([
      'HC_P0',
      'HC_Q0',
      'HC_Q1',
    ]);
  });

  it('fills up to the limit with the nearest yellow centres, and never shows a red one', () => {
    const result = findCandidates(placed(NEAR), 'HC_A', [], null, NOW, assumptions);

    expect(result.candidates.map((c) => [c.centreId, c.status])).toEqual([
      ['HC_P0', 'green'],
      ['HC_Q0', 'green'],
      ['HC_Q1', 'green'],
      ['HC_B', 'yellow'],
      ['HC_C', 'yellow'],
    ]);
    expect(ids(result)).not.toContain('HC_D');
    expect(result.candidates[3].reason).toContain('Bedok Corner');
  });

  it('shows no yellow centre while there are as many greens as the limit', () => {
    const result = findCandidates(placed(NEAR), 'HC_A', [], null, NOW, withValues({ 'candidates.max_shown': 2 }));

    expect(result.candidates.map((c) => c.status)).toEqual(['green', 'green']);
  });

  it('keeps to centres within the walking cutoff of the anchor, as the crow flies', () => {
    const data = placed({ ...NEAR, HC_P0: 1.99, HC_Q0: 2.05 });

    const result = findCandidates(data, 'HC_A', [], null, NOW, assumptions);

    expect(ids(result)).toContain('HC_P0');
    expect(ids(result)).not.toContain('HC_Q0');
    expect(result.candidates.find((c) => c.centreId === 'HC_P0')!.distanceM).toBeCloseTo(1990, -1);
  });

  it('leaves out interim centres, the anchor and the centres already in the plan', () => {
    const data = placed(NEAR);
    data.centres = data.centres.map((c) => (c.centre_id === 'HC_P0' ? { ...c, is_interim: true } : c));

    const result = findCandidates(data, 'HC_A', ['HC_Q0'], null, NOW, assumptions);

    expect(ids(result)).not.toContain('HC_P0');
    expect(ids(result)).not.toContain('HC_Q0');
    expect(ids(result)).not.toContain('HC_A');
  });

  it('judges a candidate by its own card in the plan with it added', () => {
    // With Q0 already in the plan, B is still yellow: it pushes D past the typical benchmark either way.
    const result = findCandidates(placed(NEAR), 'HC_A', ['HC_Q0'], null, NOW, assumptions);

    expect(result.candidates.find((c) => c.centreId === 'HC_B')).toMatchObject({ status: 'yellow' });
  });

  describe('closure window', () => {
    const window = { from: '2026-09-01', to: '2026-11-30' };

    it('drops a centre with a renovation, redevelopment or partial closure overlapping the window', () => {
      const data = placed(NEAR, {}, [
        closure('HC_P0', 'renovation', '2026-11-15', '2027-02-14'),
        closure('HC_Q0', 'redevelopment', '2026-08-01', '2026-09-15'),
        closure('HC_Q1', 'partial', '2026-10-01', '2026-10-31'),
      ]);

      const result = findCandidates(data, 'HC_A', [], window, NOW, assumptions);

      expect(ids(result)).not.toContain('HC_P0');
      expect(ids(result)).not.toContain('HC_Q0');
      expect(ids(result)).not.toContain('HC_Q1');
      expect(result.overlapChecked).toBe(true);
    });

    it('keeps a centre whose closure ends before the window starts or starts after it ends', () => {
      const data = placed(NEAR, {}, [
        closure('HC_P0', 'renovation', '2026-06-01', '2026-08-31'),
        closure('HC_Q0', 'renovation', '2026-12-01', '2027-02-28'),
      ]);

      expect(ids(findCandidates(data, 'HC_A', [], window, NOW, assumptions))).toEqual(
        expect.arrayContaining(['HC_P0', 'HC_Q0'])
      );
    });

    it('keeps a centre with a cleaning closure in the window and notes it', () => {
      const data = placed(NEAR, {}, [closure('HC_P0', 'cleaning', '2026-10-05', '2026-10-06')]);

      const p0 = findCandidates(data, 'HC_A', [], window, NOW, assumptions).candidates.find(
        (c) => c.centreId === 'HC_P0'
      );

      expect(p0?.cleaning).toEqual([{ startDate: '2026-10-05', endDate: '2026-10-06' }]);
    });

    it('counts a closure that touches the first or last day of the window as an overlap', () => {
      const data = placed(NEAR, {}, [
        closure('HC_P0', 'renovation', '2026-11-30', '2027-02-28'),
        closure('HC_Q0', 'renovation', '2026-06-01', '2026-09-01'),
      ]);

      const result = findCandidates(data, 'HC_A', [], window, NOW, assumptions);

      expect(ids(result)).not.toContain('HC_P0');
      expect(ids(result)).not.toContain('HC_Q0');
    });

    it('rejects a window that ends before it starts', () => {
      expect(() =>
        findCandidates(placed(NEAR), 'HC_A', [], { from: '2026-12-01', to: '2026-09-01' }, NOW, assumptions)
      ).toThrow(/window/i);
    });
  });

  it('skips the overlap check without a window, and says so', () => {
    const data = placed(NEAR, {}, [closure('HC_P0', 'renovation', '2026-10-01', '2026-12-31')]);

    const result = findCandidates(data, 'HC_A', [], null, NOW, assumptions);

    expect(ids(result)).toContain('HC_P0');
    expect(result.overlapChecked).toBe(false);
    expect(result.candidates.every((c) => c.cleaning.length === 0)).toBe(true);
  });

  it('returns nothing, and says the plan is full, when no more centres can be added', () => {
    const full = ['HC_B', 'HC_C', 'HC_P0', 'HC_Q0', 'HC_Q1'];

    const result = findCandidates(placed(NEAR), 'HC_A', full, null, NOW, assumptions);

    expect(result).toMatchObject({ candidates: [], planFull: true });
  });

  it('returns nothing, without error, when no centre is within the cutoff', () => {
    expect(findCandidates(placed({}), 'HC_A', [], null, NOW, assumptions)).toMatchObject({
      candidates: [],
      planFull: false,
    });
  });

  it('rejects a plan the engine rejects', () => {
    expect(() => findCandidates(placed(NEAR), 'HC_NOPE', [], null, NOW, assumptions)).toThrow(/No centre/);
  });
});
