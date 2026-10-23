import type { StyleSpecification } from 'maplibre-gl';

// Singapore, as [west, south, east, north]. OneMap only serves tiles inside this box.
export const SG_BOUNDS: [number, number, number, number] = [103.596, 1.1443, 104.1, 1.4835];
// Panning stops a little outside Singapore, so the island never leaves the frame.
export const SG_MAX_BOUNDS: [number, number, number, number] = [103.45, 1.05, 104.25, 1.58];
export const SG_VIEW = { longitude: 103.82, latitude: 1.352, zoom: 10.6 };

// Tried in order. 'none' is the background colour alone, with subzone outlines drawn over it by BaseMap.
export type Basemap = 'onemap' | 'carto' | 'none';
const ORDER: Basemap[] = ['onemap', 'carto', 'none'];

const BASEMAP_SOURCE = 'basemap';
export const BACKGROUND = '#f2f2ef';

const SOURCES = {
  onemap: {
    tiles: ['https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png'],
    minzoom: 11,
    maxzoom: 19,
    bounds: SG_BOUNDS,
    attribution:
      '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noreferrer">Singapore Land Authority</a>',
  },
  carto: {
    tiles: ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`),
    minzoom: 0,
    maxzoom: 20,
    bounds: SG_BOUNDS,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
  },
};

export function styleFor(basemap: Basemap): StyleSpecification {
  const background = { id: 'background', type: 'background' as const, paint: { 'background-color': BACKGROUND } };
  if (basemap === 'none') return { version: 8, sources: {}, layers: [background] };
  return {
    version: 8,
    sources: { [BASEMAP_SOURCE]: { type: 'raster', tileSize: 256, ...SOURCES[basemap] } },
    layers: [background, { id: BASEMAP_SOURCE, type: 'raster', source: BASEMAP_SOURCE }],
  };
}

export function isBasemapSource(sourceId: string | undefined): boolean {
  return sourceId === BASEMAP_SOURCE;
}

// Tile errors before any tile loads mean the basemap is unreachable (blocked, down or offline),
// so move to the next one. Errors after a tile has loaded are a missing edge tile and are ignored.
export const MAX_TILE_ERRORS = 3;

export interface TileState {
  basemap: Basemap;
  loaded: boolean;
  errors: number;
}
export type TileEvent = { type: 'tile-loaded' } | { type: 'tile-error' };

export const INITIAL_TILES: TileState = { basemap: 'onemap', loaded: false, errors: 0 };

export function onTileEvent(state: TileState, event: TileEvent): TileState {
  if (event.type === 'tile-loaded') return state.loaded ? state : { ...state, loaded: true };
  if (state.loaded || state.basemap === 'none') return state;
  const errors = state.errors + 1;
  if (errors < MAX_TILE_ERRORS) return { ...state, errors };
  return { basemap: ORDER[ORDER.indexOf(state.basemap) + 1], loaded: false, errors: 0 };
}
