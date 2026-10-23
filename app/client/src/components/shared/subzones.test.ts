import { expect, test } from 'vitest';
import { toFeatureCollection } from './subzones';

test('subzone rows become one GeoJSON feature each, geometry parsed', () => {
  const square = { type: 'Polygon', coordinates: [[[103.8, 1.3], [103.81, 1.3], [103.81, 1.31], [103.8, 1.3]]] };
  const fc = toFeatureCollection([
    { subzone_id: 'TPSZ01', name: 'Potong Pasir', planning_area: 'TOA PAYOH', geometry: JSON.stringify(square) },
  ]);
  expect(fc.features).toHaveLength(1);
  expect(fc.features[0].geometry).toEqual(square);
  expect(fc.features[0].properties).toEqual({ subzone_id: 'TPSZ01', name: 'Potong Pasir', planning_area: 'TOA PAYOH' });
});
