import { describe, expect, test } from 'vitest';
import { toGoldData } from './goldRows';

// AppKit sends every value as a string, and a missing value as null or "".
describe('toGoldData', () => {
  test('parses block options, keeping a block with no centre within 2 km', () => {
    const data = toGoldData({
      blockOptions: [
        {
          block_id: 'B1',
          centre_id: 'C1',
          walk_m: '412.5',
          rank: '1',
          lon: '103.85',
          lat: '1.33',
          subzone_id: 'TPSZ01',
          est_residents: '120.4',
          est_seniors: '20.1',
          diners_per_day: '42.8',
        },
        {
          block_id: 'B2',
          centre_id: null,
          walk_m: '',
          rank: '1',
          lon: '103.86',
          lat: '1.34',
          subzone_id: 'TPSZ02',
          est_residents: '80',
          est_seniors: '9',
          diners_per_day: '28.5',
        },
      ],
      centres: [],
      centreDemand: [],
      centreClosures: [],
    });

    expect(data.blockOptions).toEqual([
      {
        block_id: 'B1',
        centre_id: 'C1',
        walk_m: 412.5,
        rank: 1,
        lon: 103.85,
        lat: 1.33,
        subzone_id: 'TPSZ01',
        est_residents: 120.4,
        est_seniors: 20.1,
        diners_per_day: 42.8,
      },
      {
        block_id: 'B2',
        centre_id: null,
        walk_m: null,
        rank: 1,
        lon: 103.86,
        lat: 1.34,
        subzone_id: 'TPSZ02',
        est_residents: 80,
        est_seniors: 9,
        diners_per_day: 28.5,
      },
    ]);
  });

  test('parses centres, demand and closures', () => {
    const data = toGoldData({
      blockOptions: [],
      centres: [
        {
          centre_id: 'C1',
          name: 'Kim Keat Palm',
          lon: '103.85',
          lat: '1.33',
          cooked_food_stalls: '42',
          is_interim: 'false',
          pln_area_n: 'TOA PAYOH',
          subzone_id: 'TPSZ01',
          opening_year: '1975',
        },
        {
          centre_id: 'C2',
          name: 'No Year',
          lon: '103.86',
          lat: '1.34',
          cooked_food_stalls: '10',
          is_interim: 'false',
          pln_area_n: 'TOA PAYOH',
          subzone_id: 'TPSZ01',
          opening_year: null,
        },
      ],
      centreDemand: [
        {
          centre_id: 'C1',
          baseline_residents: '5000',
          baseline_diners_per_day: '1778.6',
          residents_per_stall: '119.0',
          possibly_undercounted: 'true',
        },
      ],
      centreClosures: [
        {
          closure_id: 'K1',
          centre_id: 'C1',
          type: 'renovation',
          start_date: '2026-09-14',
          end_date: '2026-12-13',
          duration_days: '91',
          remarks: null,
        },
      ],
    });

    expect(data.centres).toEqual([
      {
        centre_id: 'C1',
        name: 'Kim Keat Palm',
        lon: 103.85,
        lat: 1.33,
        cooked_food_stalls: 42,
        is_interim: false,
        pln_area_n: 'TOA PAYOH',
        subzone_id: 'TPSZ01',
        opening_year: 1975,
      },
      {
        centre_id: 'C2',
        name: 'No Year',
        lon: 103.86,
        lat: 1.34,
        cooked_food_stalls: 10,
        is_interim: false,
        pln_area_n: 'TOA PAYOH',
        subzone_id: 'TPSZ01',
        opening_year: null,
      },
    ]);
    expect(data.centreDemand).toEqual([
      {
        centre_id: 'C1',
        baseline_residents: 5000,
        baseline_diners_per_day: 1778.6,
        residents_per_stall: 119,
        possibly_undercounted: true,
      },
    ]);
    expect(data.centreClosures).toEqual([
      {
        closure_id: 'K1',
        centre_id: 'C1',
        type: 'renovation',
        start_date: '2026-09-14',
        end_date: '2026-12-13',
        duration_days: 91,
        remarks: null,
      },
    ]);
  });
});
