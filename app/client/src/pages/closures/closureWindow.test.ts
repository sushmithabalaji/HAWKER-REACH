import { describe, expect, test } from 'vitest';
import type { CentreClosureRow } from '@shared/closure-engine';
import { localToday, resolveWindow, suggestedWindow } from './closureWindow';

const closure = (
  id: string,
  centre: string,
  type: CentreClosureRow['type'],
  start: string,
  end: string
): CentreClosureRow => ({
  closure_id: id,
  centre_id: centre,
  type,
  start_date: start,
  end_date: end,
  duration_days: 90,
  remarks: null,
});

describe('suggestedWindow', () => {
  const closures = [
    closure('a', 'C1', 'renovation', '2026-01-05', '2026-03-31'),
    closure('b', 'C1', 'renovation', '2027-02-01', '2027-04-30'),
    closure('c', 'C1', 'renovation', '2026-11-02', '2027-01-31'),
    closure('d', 'C1', 'cleaning', '2026-10-30', '2026-10-31'),
    closure('e', 'C2', 'renovation', '2026-10-27', '2026-12-31'),
  ];

  test('is the anchor’s next scheduled works, skipping the ones already over', () => {
    expect(suggestedWindow(closures, 'C1', '2026-10-25')).toEqual({ from: '2026-11-02', to: '2027-01-31' });
  });

  test('includes works that are under way today', () => {
    expect(suggestedWindow(closures, 'C1', '2026-01-31')).toEqual({ from: '2026-01-05', to: '2026-03-31' });
  });

  test('counts works that end today', () => {
    expect(suggestedWindow(closures, 'C1', '2026-03-31')).toEqual({ from: '2026-01-05', to: '2026-03-31' });
  });

  test('ignores cleaning and other centres', () => {
    expect(suggestedWindow([closures[3], closures[4]], 'C1', '2026-10-25')).toBeNull();
  });

  test('is null when the anchor has nothing scheduled', () => {
    expect(suggestedWindow(closures, 'C9', '2026-10-25')).toBeNull();
    expect(suggestedWindow(closures, 'C1', '2028-01-01')).toBeNull();
  });
});

describe('localToday', () => {
  test('is the local calendar date, zero-padded', () => {
    expect(localToday(new Date(2026, 0, 5, 1, 30))).toBe('2026-01-05');
    expect(localToday(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-25');
  });
});

describe('resolveWindow', () => {
  const suggested = { from: '2026-11-02', to: '2027-01-31' };

  test('uses the suggestion until the planner types dates for this anchor', () => {
    expect(resolveWindow(null, 'C1', suggested)).toMatchObject({ from: '2026-11-02', state: { kind: 'ok' } });
    expect(resolveWindow({ anchorId: 'C2', from: '2026-01-01', to: '2026-02-01' }, 'C1', suggested).from).toBe(
      '2026-11-02'
    );
  });

  test('uses the planner’s dates for this anchor over the suggestion', () => {
    const r = resolveWindow({ anchorId: 'C1', from: '2026-12-01', to: '2026-12-31' }, 'C1', suggested);

    expect(r.state).toEqual({ kind: 'ok', window: { from: '2026-12-01', to: '2026-12-31' } });
  });

  test('is none when there are no dates, and the planner can clear a suggestion', () => {
    expect(resolveWindow(null, 'C1', null).state).toEqual({ kind: 'none' });
    expect(resolveWindow({ anchorId: 'C1', from: '', to: '' }, 'C1', suggested).state).toEqual({ kind: 'none' });
  });

  test('flags one date missing, and dates the wrong way round', () => {
    expect(resolveWindow({ anchorId: 'C1', from: '2026-12-01', to: '' }, 'C1', null).state).toEqual({
      kind: 'incomplete',
    });
    expect(resolveWindow({ anchorId: 'C1', from: '2026-12-31', to: '2026-12-01' }, 'C1', null).state).toEqual({
      kind: 'backwards',
    });
  });
});
