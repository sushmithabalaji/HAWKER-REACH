import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import type { FeatureCollection, Geometry } from 'geojson';
import { toCentre, type Centre } from './centres';
import { NO_PARAMS, type RawRow } from './queryValues';
import { toFeatureCollection, type SubzoneProps, type SubzoneShapeRow } from './subzones';

interface GeoData {
  subzones: FeatureCollection<Geometry, SubzoneProps> | null;
  centres: Centre[] | null;
  loading: boolean;
  error: string | null;
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
      centres: centres.data ? (centres.data as unknown as RawRow[]).map(toCentre) : null,
      loading: shapes.loading || centres.loading,
      error: shapes.error ?? centres.error,
    }),
    [shapes.data, shapes.loading, shapes.error, centres.data, centres.loading, centres.error]
  );

  return <GeoDataContext.Provider value={value}>{children}</GeoDataContext.Provider>;
}

export function useGeoData(): GeoData {
  const value = useContext(GeoDataContext);
  if (!value) throw new Error('useGeoData needs a GeoDataProvider (it is in the app layout)');
  return value;
}
