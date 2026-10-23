import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import type { FeatureCollection, Geometry } from 'geojson';
import { toCentre, type Centre } from './centres';
import { NO_PARAMS, type RawRow } from './queryValues';
import { toFeatureCollection, type SubzoneProps, type SubzoneShapeRow } from './subzones';

// Each query keeps its own error, so a failed shapes query doesn't hide centres that loaded.
interface GeoData {
  subzones: FeatureCollection<Geometry, SubzoneProps> | null;
  subzonesError: string | null;
  centres: Centre[] | null;
  centresError: string | null;
}

const GeoDataContext = createContext<GeoData | null>(null);

// Mounted once in the app layout, so subzone shapes and centres load once per visit and every
// BaseMap and CentreSearch on every page shares them.
export function GeoDataProvider({ children }: { children: ReactNode }) {
  const shapes = useAnalyticsQuery('shared_subzone_shapes', NO_PARAMS);
  const centres = useAnalyticsQuery('shared_centres', NO_PARAMS);

  const value = useMemo<GeoData>(
    () => ({
      subzones: shapes.data ? toFeatureCollection(shapes.data as SubzoneShapeRow[]) : null,
      subzonesError: shapes.error,
      centres: centres.data ? (centres.data as unknown as RawRow[]).map(toCentre) : null,
      centresError: centres.error,
    }),
    [shapes.data, shapes.error, centres.data, centres.error]
  );

  return <GeoDataContext.Provider value={value}>{children}</GeoDataContext.Provider>;
}

export function useGeoData(): GeoData {
  const value = useContext(GeoDataContext);
  if (!value) throw new Error('useGeoData needs a GeoDataProvider (it is in the app layout)');
  return value;
}
