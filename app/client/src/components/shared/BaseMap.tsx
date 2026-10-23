import { useEffect, useMemo, useReducer, useState } from 'react';
import { Map, useControl, type ErrorEvent, type MapSourceDataEvent } from 'react-map-gl/maplibre';
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { LayersList } from '@deck.gl/core';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  basemapOfSource,
  CARTO_STYLE_URL,
  cartoStyle,
  INITIAL_TILES,
  onTileEvent,
  SG_MAX_BOUNDS,
  SG_VIEW,
  styleFor,
} from './basemapStyles';
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
  const [carto, setCarto] = useState<StyleSpecification | null>(null);

  // Carto's style is fetched only once OneMap has failed. Until it arrives the map shows outlines alone.
  const needCarto = tiles.basemap === 'carto' && !carto;
  useEffect(() => {
    if (!needCarto) return;
    let live = true;
    fetch(CARTO_STYLE_URL)
      .then((r) => (r.ok ? (r.json() as Promise<StyleSpecification>) : Promise.reject(new Error(String(r.status)))))
      .then((style) => live && setCarto(cartoStyle(style)))
      .catch(() => live && dispatch({ type: 'style-error', basemap: 'carto' }));
    return () => {
      live = false;
    };
  }, [needCarto]);

  const mapStyle = useMemo(
    () => (tiles.basemap === 'carto' ? (carto ?? styleFor('none')) : styleFor(tiles.basemap)),
    [tiles.basemap, carto]
  );

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
    const basemap = basemapOfSource(e.sourceId);
    if (basemap && e.tile) dispatch({ type: 'tile-loaded', basemap });
  };
  const onError = (e: ErrorEvent) => {
    // MapLibre puts the failing source on tile errors; other errors aren't the basemap's
    const basemap = basemapOfSource((e as ErrorEvent & { sourceId?: string }).sourceId);
    if (basemap) dispatch({ type: 'tile-error', basemap });
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
