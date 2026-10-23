import type { FeatureCollection, Geometry } from 'geojson';

// A row of gold.subzone_shapes, as config/queries/shared_subzone_shapes.sql reads it.
export interface SubzoneShapeRow {
  subzone_id: string;
  name: string;
  planning_area: string;
  // GeoJSON. Stored as a string, but AppKit's JSON format sends it already parsed.
  geometry: string | Geometry;
}

export interface SubzoneProps {
  subzone_id: string;
  name: string;
  planning_area: string;
}

export function toFeatureCollection(rows: SubzoneShapeRow[]): FeatureCollection<Geometry, SubzoneProps> {
  return {
    type: 'FeatureCollection',
    features: rows.map(({ geometry, ...props }) => ({
      type: 'Feature',
      geometry: typeof geometry === 'string' ? (JSON.parse(geometry) as Geometry) : geometry,
      properties: props,
    })),
  };
}
