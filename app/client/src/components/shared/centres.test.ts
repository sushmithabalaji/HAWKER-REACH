import { describe, expect, test } from 'vitest';
import { canClose, canPick, searchCentres, toCentre, townLabel, townsOf, whyNotPickable, type Centre } from './centres';

const centre = (centre_id: string, name: string, pln_area_n: string, is_interim = false): Centre => ({
  centre_id,
  name,
  pln_area_n,
  is_interim,
  lon: 103.8,
  lat: 1.35,
});

const centres = [
  centre('1', 'Old Airport Road Food Centre', 'GEYLANG'),
  centre('2', 'Ang Mo Kio 628 Market', 'ANG MO KIO'),
  centre('3', 'Kebun Baru Market and Food Centre', 'ANG MO KIO'),
  centre('4', 'Bukit Panjang Interim Hawker Centre', 'BUKIT PANJANG', true),
  centre('5', 'Bukit Timah Market', 'BUKIT TIMAH'),
];
const ids = (cs: Centre[]) => cs.map((c) => c.centre_id);

describe('searchCentres', () => {
  test('an empty query lists every centre, closable first then by name', () => {
    expect(ids(searchCentres(centres, ''))).toEqual(['2', '5', '3', '1', '4']);
  });

  test('matches the start of any word in the name, case-insensitive', () => {
    expect(ids(searchCentres(centres, 'airport'))).toEqual(['1']);
    expect(ids(searchCentres(centres, 'FOOD'))).toEqual(['3', '1']);
  });

  test('every word must match, in any order', () => {
    expect(ids(searchCentres(centres, 'market bukit'))).toEqual(['5']);
    expect(ids(searchCentres(centres, 'bukit zzz'))).toEqual([]);
  });

  test('matches the town too', () => {
    expect(ids(searchCentres(centres, 'geylang'))).toEqual(['1']);
  });

  test('does not match the middle of a word', () => {
    expect(ids(searchCentres(centres, 'port'))).toEqual([]);
  });

  test('the town filter narrows to one planning area', () => {
    expect(ids(searchCentres(centres, '', 'ANG MO KIO'))).toEqual(['2', '3']);
    expect(ids(searchCentres(centres, 'kebun', 'ANG MO KIO'))).toEqual(['3']);
    expect(ids(searchCentres(centres, 'airport', 'ANG MO KIO'))).toEqual([]);
  });

  test('interim centres are listed, after closable ones', () => {
    expect(ids(searchCentres(centres, 'bukit'))).toEqual(['5', '4']);
  });
});

describe('centres', () => {
  test("interim centres can't be closed", () => {
    expect(canClose(centres[0])).toBe(true);
    expect(canClose(centres[3])).toBe(false);
  });

  test('towns are unique and sorted', () => {
    expect(townsOf(centres)).toEqual(['ANG MO KIO', 'BUKIT PANJANG', 'BUKIT TIMAH', 'GEYLANG']);
  });

  test('town labels are title case', () => {
    expect(townLabel('ANG MO KIO')).toBe('Ang Mo Kio');
  });
});

describe('toCentre', () => {
  test('parses the strings AppKit sends into numbers and booleans', () => {
    const row = {
      centre_id: 'HC_1',
      name: 'Adam Road Food Centre',
      lon: '103.81',
      lat: '1.32',
      is_interim: 'false',
      pln_area_n: 'NOVENA',
    };
    expect(toCentre(row)).toEqual({ ...row, lon: 103.81, lat: 1.32, is_interim: false });
    expect(canClose(toCentre(row))).toBe(true);
    expect(canClose(toCentre({ ...row, is_interim: 'true' }))).toBe(false);
  });

  test('accepts values that are already typed', () => {
    expect(
      toCentre({ centre_id: 'HC_1', name: 'X', lon: 103.8, lat: 1.3, is_interim: true, pln_area_n: 'BEDOK' })
    ).toMatchObject({
      lon: 103.8,
      is_interim: true,
    });
  });
});

describe('picking a centre to close', () => {
  test('a closable centre can be picked', () => {
    expect(whyNotPickable(centres[0])).toBeNull();
    expect(canPick(centres[0])).toBe(true);
  });

  test("interim centres can't be picked", () => {
    expect(whyNotPickable(centres[3])).toBe('Interim, stays open');
  });

  test("centres the page excludes can't be picked", () => {
    expect(whyNotPickable(centres[0], ['1'])).toBe('Already picked');
    expect(canPick(centres[1], ['1'])).toBe(true);
  });
});
