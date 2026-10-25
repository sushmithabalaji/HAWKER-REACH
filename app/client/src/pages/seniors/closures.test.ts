import { describe, expect, test } from 'vitest';
import {
  closureFor,
  closureLabel,
  dateRange,
  nearbyWorks,
  overlappingClosures,
  pickableIn,
  toNeaClosure,
  type NeaClosure,
} from './closures';

const closure = (
  closure_id: string,
  centre_id: string,
  type: string,
  start_date: string,
  end_date: string,
  town = 'TOA PAYOH'
): NeaClosure => ({
  closure_id,
  centre_id,
  name: `Centre ${centre_id}`,
  pln_area_n: town,
  type,
  start_date,
  end_date,
  duration_days: 1,
  remarks: '',
});

const kimKeat = closure('k1', 'HC_KK', 'renovation', '2026-09-14', '2026-12-13');
const closures = [
  kimKeat,
  closure('k2', 'HC_TB', 'renovation', '2026-11-01', '2026-12-31', 'BUKIT MERAH'),
  closure('k3', 'HC_LATER', 'redevelopment', '2027-01-05', '2027-06-30'),
  closure('k4', 'HC_NEXT', 'cleaning', '2026-10-05', '2026-10-08'),
  closure('k5', 'HC_FAR', 'cleaning', '2026-10-05', '2026-10-06'),
  closure('k6', 'HC_KK', 'cleaning', '2026-09-01', '2026-09-02'),
];
const ids = (cs: NeaClosure[]) => cs.map((c) => c.closure_id);

describe('pickableIn', () => {
  test('renovation and redevelopment only, in the town', () => {
    expect(ids(pickableIn(closures, 'TOA PAYOH'))).toEqual(['k1', 'k3']);
  });

  test('every town when none is chosen', () => {
    expect(ids(pickableIn(closures, null))).toEqual(['k1', 'k2', 'k3']);
  });
});

describe('overlapping closures', () => {
  test('other centres closed for works during the picked dates count as closed', () => {
    expect(ids(overlappingClosures(kimKeat, closures))).toEqual(['k2']);
    expect(closureFor(kimKeat, closures)).toEqual({ centreId: 'HC_KK', alsoClosed: ['HC_TB'] });
  });

  test('a closure touching on the last day overlaps', () => {
    const next = closure('k7', 'HC_X', 'renovation', '2026-12-13', '2027-01-01');
    expect(ids(overlappingClosures(kimKeat, [next]))).toEqual(['k7']);
  });

  test('cleaning at a neighbour counts as open', () => {
    expect(closureFor(kimKeat, closures).alsoClosed).not.toContain('HC_NEXT');
    expect(ids(nearbyWorks(kimKeat, closures, new Set(['HC_NEXT'])))).toEqual([]);
  });

  test('only works at centres the affected blocks would move to are listed', () => {
    expect(ids(nearbyWorks(kimKeat, closures, new Set(['HC_TB'])))).toEqual(['k2']);
  });
});

describe('dateRange', () => {
  test('one year, or across years', () => {
    expect(dateRange(kimKeat)).toBe('14 Sep – 13 Dec 2026');
    expect(dateRange(closure('x', 'HC', 'renovation', '2026-12-01', '2027-01-31'))).toBe('1 Dec 2026 – 31 Jan 2027');
  });
});

test('toNeaClosure parses the query row', () => {
  const c = toNeaClosure({
    closure_id: 'e438',
    centre_id: 'HC_119385',
    name: 'Telok Blangah Rise Blk 36',
    pln_area_n: 'BUKIT MERAH',
    type: 'renovation',
    start_date: '2026-11-01',
    end_date: '2026-12-31',
    duration_days: '61',
    remarks: null,
  });
  expect(c).toMatchObject({ duration_days: 61, remarks: '', start_date: '2026-11-01' });
});

test('closureLabel uses the short name', () => {
  const c = { ...kimKeat, name: 'Toa Payoh Lorong 7 Blk 22 (Kim Keat Palm Market and Food Centre)' };
  expect(closureLabel(c)).toBe('Kim Keat Palm (14 Sep – 13 Dec 2026)');
});
