import type { StyleSpecification } from 'maplibre-gl';

export type Bounds = [west: number, south: number, east: number, north: number];

// Singapore. OneMap only serves tiles inside this box.
export const SG_BOUNDS: Bounds = [103.596, 1.1443, 104.1, 1.4835];
// Panning stops a little outside Singapore, so the island never leaves the frame.
export const SG_MAX_BOUNDS: Bounds = [103.45, 1.05, 104.25, 1.58];
export const SG_VIEW = { longitude: 103.82, latitude: 1.352, zoom: 10.6 };

// Tried in order. 'none' is the background colour alone, with subzone outlines drawn over it by BaseMap.
export type Basemap = 'onemap' | 'carto' | 'none';
const ORDER: Basemap[] = ['onemap', 'carto', 'none'];

// Each basemap has its own source id, so a late error from one isn't counted against the next.
const SOURCE_PREFIX = 'basemap-';
export const BACKGROUND = '#f2f2ef';

const ONEMAP = {
  tiles: ['https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png'],
  minzoom: 11,
  maxzoom: 19,
  bounds: SG_BOUNDS,
  attribution:
    '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noreferrer">Singapore Land Authority</a>',
};

// Carto's raster tiles now return an "API key required" watermark; its Positron vector style
// doesn't need a key. BaseMap fetches it when OneMap fails and passes it through cartoStyle.
export const CARTO_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// OneMap tiles, or the background alone. Carto comes from cartoStyle.
export function styleFor(basemap: 'onemap' | 'none'): StyleSpecification {
  const background = { id: 'background', type: 'background' as const, paint: { 'background-color': BACKGROUND } };
  if (basemap === 'none') return { version: 8, sources: {}, layers: [background] };
  const id = SOURCE_PREFIX + 'onemap';
  return {
    version: 8,
    sources: { [id]: { type: 'raster', tileSize: 256, ...ONEMAP } },
    layers: [background, { id, type: 'raster', source: id }],
  };
}

// Carto's style with its sources renamed under our prefix, so its tile events map back to Carto.
export function cartoStyle(style: StyleSpecification): StyleSpecification {
  const rename = (id: string) => `${SOURCE_PREFIX}carto-${id}`;
  return {
    ...style,
    sources: Object.fromEntries(Object.entries(style.sources).map(([id, source]) => [rename(id), source])),
    layers: style.layers.map((layer) =>
      'source' in layer && typeof layer.source === 'string' ? { ...layer, source: rename(layer.source) } : layer
    ),
  };
}

// The basemap a map source belongs to, or null for any other source.
export function basemapOfSource(sourceId: string | undefined): Basemap | null {
  if (!sourceId?.startsWith(SOURCE_PREFIX)) return null;
  const [name] = sourceId.slice(SOURCE_PREFIX.length).split('-');
  return name === 'onemap' || name === 'carto' ? name : null;
}

// Tile errors before any tile loads mean the basemap is unreachable (blocked, down or offline),
// so move to the next one. Errors after a tile has loaded are a missing edge tile and are ignored.
export const MAX_TILE_ERRORS = 3;

export interface TileState {
  basemap: Basemap;
  loaded: boolean;
  errors: number;
}
export interface TileEvent {
  // style-error: the basemap's style itself couldn't load, so skip it at once
  type: 'tile-loaded' | 'tile-error' | 'style-error';
  basemap: Basemap;
}

export const INITIAL_TILES: TileState = { basemap: 'onemap', loaded: false, errors: 0 };

export function nextTileState(state: TileState, event: TileEvent): TileState {
  if (event.basemap !== state.basemap) return state; // from a basemap already given up on
  if (event.type === 'tile-loaded') return state.loaded ? state : { ...state, loaded: true };
  if (state.loaded || state.basemap === 'none') return state;
  const errors = event.type === 'style-error' ? MAX_TILE_ERRORS : state.errors + 1;
  if (errors < MAX_TILE_ERRORS) return { ...state, errors };
  return { basemap: ORDER[ORDER.indexOf(state.basemap) + 1], loaded: false, errors: 0 };
}
