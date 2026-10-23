import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { BaseMap } from '@/components/shared/BaseMap';
import { CentreSearch } from '@/components/shared/CentreSearch';
import { canClose, type Centre } from '@/components/shared/centres';
import { useGeoData } from '@/components/shared/GeoData';

interface BlockPoint {
  block_id: string;
  lon: number;
  lat: number;
}

const NO_PARAMS = {};
const CLOSABLE: [number, number, number] = [37, 99, 235];
const INTERIM: [number, number, number] = [22, 163, 74];
const PICKED: [number, number, number] = [220, 38, 38];

// Shell check for the shared map: every HDB block and centre on BaseMap, with CentreSearch picking
// one. Proves tiles, the subzone fallback and ~10k points work in the deployed app.
export function MapCheck() {
  const { centres } = useGeoData();
  const { data: blocks, error } = useAnalyticsQuery('home_block_points', NO_PARAMS);
  const [picked, setPicked] = useState<string | null>(null);

  const layers = useMemo(
    () => [
      new ScatterplotLayer<BlockPoint>({
        id: 'blocks',
        data: (blocks as BlockPoint[] | null) ?? [],
        getPosition: (b) => [b.lon, b.lat],
        getFillColor: [100, 116, 139, 140],
        radiusUnits: 'pixels',
        getRadius: 1.5,
      }),
      new ScatterplotLayer<Centre>({
        id: 'centres',
        data: centres ?? [],
        getPosition: (c) => [c.lon, c.lat],
        getFillColor: (c) => (c.centre_id === picked ? PICKED : canClose(c) ? CLOSABLE : INTERIM),
        radiusUnits: 'pixels',
        getRadius: (c) => (c.centre_id === picked ? 8 : 4),
        pickable: true,
        updateTriggers: { getFillColor: picked, getRadius: picked },
      }),
    ],
    [blocks, centres, picked]
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Map check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CentreSearch selectedId={picked} onSelect={(c) => setPicked(c.centre_id)} />
        {error && <div className="text-destructive bg-destructive/10 p-3 rounded-md">Error: {error}</div>}
        <BaseMap
          layers={layers}
          getTooltip={({ layer, object }) => {
            if (layer?.id !== 'centres' || !object) return null;
            const c = object as Centre;
            return `${c.name}${canClose(c) ? '' : ' (interim)'}`;
          }}
        />
        <p className="text-xs text-muted-foreground">
          Grey dots are HDB blocks, blue dots centres that can close, green dots interim centres (open, can&apos;t
          close).
        </p>
      </CardContent>
    </Card>
  );
}
