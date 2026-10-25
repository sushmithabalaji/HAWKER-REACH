import { describe, expect, it } from 'vitest';
import { findCandidates } from './candidates';
import type { CentreClosureRow, GoldData } from './gold';
import { assumptions, verdictTown, withValues } from './sample';

const TODAY = '2026-10-26';

// With the anchor A: B and C are yellow (with A they push D to 15%), D is red (it is block bA's only fallback), and
// every P and Q is green. Diners today are 1,000 a day each unless set here; only P centres are changed, since each
// Q is its P's fallback and a smaller Q would make closing its P harm it.
function townWith(diners: Record<string, number> = {}, closures: CentreClosureRow[] = []): GoldData {
  const data = verdictTown();
  return {
    ...data,
    centreDemand: data.centreDemand.map((d) =>
      d.centre_id in diners ? { ...d, baseline_diners_per_day: diners[d.centre_id] } : d
    ),
    centreClosures: closures,
  };
}

const ids = (r: { candidates: { centreId: string }[] }) => r.candidates.map((c) => c.centreId);

function closure(
  centre: string,
  type: CentreClosureRow['type'],
  start: string,
  end: string,
  remarks: string | null = null
): CentreClosureRow {
  return {
    closure_id: `${centre}-${type}-${start}`,
    centre_id: centre,
    type,
    start_date: start,
    end_date: end,
    duration_days: 90,
    remarks,
  };
}
const rr = (centre: string, start: string, end: string) =>
  closure(centre, 'renovation', start, end, 'Repairs and Redecoration');

describe('findCandidates', () => {
  it('keeps only green centres, never a yellow or red one', () => {
    const result = findCandidates(townWith(), 'HC_A', [], null, TODAY, withValues({ 'candidates.max_shown': 20 }));

    expect(ids(result)).toHaveLength(10);
    expect(ids(result)).not.toContain('HC_B');
    expect(ids(result)).not.toContain('HC_C');
    expect(ids(result)).not.toContain('HC_D');
  });

  it('ranks a due centre that cuts seniors off when closed on its own below one that cuts no one off', () => {
    // P0's block now has no fallback, so closing P0 alone strands its 20 seniors. With the anchor it is still green.
    const data = townWith({ HC_P0: 10 });
    data.blockOptions = data.blockOptions.filter((o) => !(o.block_id === 'bP0' && o.centre_id === 'HC_Q0'));

    const result = findCandidates(data, 'HC_A', [], null, TODAY, withValues({ 'candidates.max_shown': 20 }));

    expect(result.candidates.find((c) => c.centreId === 'HC_P0')).toMatchObject({ seniorsCutOff: 20 });
    expect(ids(result)[ids(result).length - 1]).toBe('HC_P0');
  });

  it('ranks centres due for R&R first, then fewest diners displaced, and shows the top 5', () => {
    const data = townWith({ HC_P0: 300, HC_P1: 100, HC_P2: 200, HC_P3: 400 }, [
      rr('HC_P1', '2025-03-01', '2025-05-31'), // recent, so not due
    ]);

    const result = findCandidates(data, 'HC_A', [], null, TODAY, assumptions);

    expect(ids(result)).toEqual(['HC_P2', 'HC_P0', 'HC_P3', 'HC_P4', 'HC_Q0']);
    expect(result.candidates[0]).toMatchObject({ dueForRR: true, lastRR: null, dinersDisplacedPerDay: 200 });
  });

  it('puts a centre whose last R&R is a full cycle ago back among the due ones', () => {
    const data = townWith({ HC_P1: 50, HC_P2: 60 }, [
      rr('HC_P1', '2020-03-01', '2020-05-31'), // 6+ years ago: due
      rr('HC_P2', '2024-03-01', '2024-05-31'), // recent: not due
    ]);

    const result = findCandidates(data, 'HC_A', [], null, TODAY, withValues({ 'candidates.max_shown': 20 }));

    expect(result.candidates[0]).toMatchObject({ centreId: 'HC_P1', dueForRR: true, lastRR: '2020-05-31' });
    expect(ids(result)[ids(result).length - 1]).toBe('HC_P2');
  });

  it("takes the latest finished R&R, and ignores other works, cleaning and works that haven't ended", () => {
    const data = townWith({}, [
      rr('HC_P0', '2024-01-01', '2024-03-31'),
      rr('HC_P0', '2025-06-01', '2025-08-31'),
      closure('HC_Q0', 'renovation', '2025-01-05', '2025-01-07', 'Urgent repair work'),
      closure('HC_P2', 'cleaning', '2026-01-05', '2026-01-06', 'Cleaning'),
      rr('HC_Q2', '2026-10-01', '2027-01-31'),
    ]);

    const byId = new Map(
      findCandidates(data, 'HC_A', [], null, TODAY, withValues({ 'candidates.max_shown': 20 })).candidates.map((c) => [
        c.centreId,
        c,
      ])
    );

    expect(byId.get('HC_P0')?.lastRR).toBe('2025-08-31');
    expect(byId.get('HC_Q0')?.lastRR).toBeNull();
    expect(byId.get('HC_P2')?.lastRR).toBeNull();
    expect(byId.get('HC_Q2')?.lastRR).toBeNull();
  });

  it('reports the year the closure records start, or null with none', () => {
    const data = townWith({}, [closure('HC_P0', 'cleaning', '2024-02-05', '2024-02-06')]);

    expect(findCandidates(data, 'HC_A', [], null, TODAY, assumptions).recordsFrom).toBe(2024);
    expect(findCandidates(townWith(), 'HC_A', [], null, TODAY, assumptions).recordsFrom).toBeNull();
  });

  it('leaves out a possibly under-counted centre, whose few diners are only a floor', () => {
    const data = townWith({ HC_P0: 0 });
    data.centreDemand = data.centreDemand.map((d) =>
      d.centre_id === 'HC_P0' ? { ...d, possibly_undercounted: true } : d
    );

    expect(
      ids(findCandidates(data, 'HC_A', [], null, TODAY, withValues({ 'candidates.max_shown': 20 })))
    ).not.toContain('HC_P0');
  });

  it('leaves out interim centres, the anchor and the centres already in the plan', () => {
    const data = townWith();
    data.centres = data.centres.map((c) => (c.centre_id === 'HC_P0' ? { ...c, is_interim: true } : c));

    const result = findCandidates(data, 'HC_A', ['HC_Q0'], null, TODAY, withValues({ 'candidates.max_shown': 20 }));

    expect(ids(result)).not.toContain('HC_P0');
    expect(ids(result)).not.toContain('HC_Q0');
    expect(ids(result)).not.toContain('HC_A');
  });

  describe('closure window', () => {
    const window = { from: '2026-09-01', to: '2026-11-30' };
    const all = withValues({ 'candidates.max_shown': 20 });

    it('drops a centre with a renovation, redevelopment or partial closure overlapping the window', () => {
      const data = townWith({}, [
        closure('HC_P0', 'renovation', '2026-11-15', '2027-02-14'),
        closure('HC_Q0', 'redevelopment', '2026-08-01', '2026-09-15'),
        closure('HC_Q1', 'partial', '2026-10-01', '2026-10-31'),
      ]);

      const result = findCandidates(data, 'HC_A', [], window, TODAY, all);

      expect(ids(result)).not.toContain('HC_P0');
      expect(ids(result)).not.toContain('HC_Q0');
      expect(ids(result)).not.toContain('HC_Q1');
      expect(result.overlapChecked).toBe(true);
    });

    it('keeps a centre whose closure ends before the window starts or starts after it ends', () => {
      const data = townWith({}, [
        closure('HC_P0', 'renovation', '2026-06-01', '2026-08-31'),
        closure('HC_Q0', 'renovation', '2026-12-01', '2027-02-28'),
      ]);

      expect(ids(findCandidates(data, 'HC_A', [], window, TODAY, all))).toEqual(
        expect.arrayContaining(['HC_P0', 'HC_Q0'])
      );
    });

    it('keeps a centre with a cleaning closure in the window and notes it', () => {
      const data = townWith({}, [closure('HC_P0', 'cleaning', '2026-10-05', '2026-10-06')]);

      const p0 = findCandidates(data, 'HC_A', [], window, TODAY, all).candidates.find((c) => c.centreId === 'HC_P0');

      expect(p0?.cleaning).toEqual([{ startDate: '2026-10-05', endDate: '2026-10-06' }]);
    });

    it('counts a closure that touches the first or last day of the window as an overlap', () => {
      const data = townWith({}, [
        closure('HC_P0', 'renovation', '2026-11-30', '2027-02-28'),
        closure('HC_Q0', 'renovation', '2026-06-01', '2026-09-01'),
      ]);

      const result = findCandidates(data, 'HC_A', [], window, TODAY, all);

      expect(ids(result)).not.toContain('HC_P0');
      expect(ids(result)).not.toContain('HC_Q0');
    });

    it('rejects a window that ends before it starts', () => {
      expect(() =>
        findCandidates(townWith(), 'HC_A', [], { from: '2026-12-01', to: '2026-09-01' }, TODAY, assumptions)
      ).toThrow(/window/i);
    });
  });

  it('skips the overlap check without a window, and says so', () => {
    const data = townWith({}, [closure('HC_P0', 'renovation', '2026-10-01', '2026-12-31')]);

    const result = findCandidates(data, 'HC_A', [], null, TODAY, withValues({ 'candidates.max_shown': 20 }));

    expect(ids(result)).toContain('HC_P0');
    expect(result.overlapChecked).toBe(false);
    expect(result.candidates.every((c) => c.cleaning.length === 0)).toBe(true);
  });

  it('returns nothing, and says the plan is full, when no more centres can be added', () => {
    const full = ['HC_B', 'HC_C', 'HC_P0', 'HC_Q0', 'HC_Q1'];

    expect(findCandidates(townWith(), 'HC_A', full, null, TODAY, assumptions)).toMatchObject({
      candidates: [],
      planFull: true,
    });
  });

  it('rejects a plan the engine rejects', () => {
    expect(() => findCandidates(townWith(), 'HC_NOPE', [], null, TODAY, assumptions)).toThrow(/No centre/);
  });
});
