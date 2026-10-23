import { useMemo, useReducer } from 'react';
import { Map, useControl, type ErrorEvent, type MapSourceDataEvent } from 'react-map-gl/maplibre';
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { LayersList } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import { INITIAL_TILES, isBasemapSource, onTileEvent, SG_MAX_BOUNDS, SG_VIEW, styleFor } from './basemapStyles';
import { useGeoData } from './GeoData';

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

interface BaseMapProps {
  // deck.gl layers drawn above the subzone outlines, bottom first.
  layers?: LayersList;
  getTooltip?: MapboxOverlayProps['getTooltip'];
  className?: string;
}

// Singapore map shared by Pages 1 and 2: OneMap grey tiles, Carto Positron if OneMap is unreachable,
// and gold.subzone_shapes always drawn underneath so the map still reads with no tiles at all.
export function BaseMap({ layers = [], getTooltip, className = 'h-[480px]' }: BaseMapProps) {
  const { subzones } = useGeoData();
  const [tiles, dispatch] = useReducer(onTileEvent, INITIAL_TILES);
  const mapStyle = useMemo(() => styleFor(tiles.basemap), [tiles.basemap]);

  const outlines = useMemo(
    () =>
      subzones &&
      new GeoJsonLayer({
        id: 'subzone-outlines',
        data: subzones,
        filled: true,
        getFillColor: [255, 255, 255, 60],
        getLineColor: [120, 120, 120, 160],
        lineWidthMinPixels: 0.5,
      }),
    [subzones]
  );

  const onSourceData = (e: MapSourceDataEvent) => {
    if (isBasemapSource(e.sourceId) && e.tile) dispatch({ type: 'tile-loaded' });
  };
  const onError = (e: ErrorEvent) => {
    // MapLibre puts the failing source on tile errors; other errors aren't the basemap's
    if (isBasemapSource((e as ErrorEvent & { sourceId?: string }).sourceId)) dispatch({ type: 'tile-error' });
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-md border ${className}`}>
      <Map
        initialViewState={SG_VIEW}
        minZoom={10}
        maxZoom={18}
        maxBounds={SG_MAX_BOUNDS}
        mapStyle={mapStyle}
        attributionControl={{ compact: true }}
        onSourceData={onSourceData}
        onError={onError}
      >
        <DeckOverlay layers={[outlines, ...layers]} getTooltip={getTooltip} />
      </Map>
    </div>
  );
}
