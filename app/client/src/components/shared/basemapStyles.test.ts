import { describe, expect, test } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import {
  basemapOfSource,
  cartoStyle,
  INITIAL_TILES,
  MAX_TILE_ERRORS,
  onTileEvent,
  styleFor,
  type Basemap,
  type TileEvent,
  type TileState,
} from './basemapStyles';

const error = (basemap: Basemap = 'onemap'): TileEvent => ({ type: 'tile-error', basemap });
const loaded = (basemap: Basemap = 'onemap'): TileEvent => ({ type: 'tile-loaded', basemap });
const run = (events: TileEvent[], from: TileState = INITIAL_TILES) => events.reduce(onTileEvent, from);
const errors = (n: number, basemap: Basemap = 'onemap') => Array.from({ length: n }, () => error(basemap));

describe('basemap fallback', () => {
  test('starts on OneMap', () => {
    expect(INITIAL_TILES.basemap).toBe('onemap');
  });

  test('a few errors before any tile loads keep OneMap', () => {
    expect(run(errors(MAX_TILE_ERRORS - 1)).basemap).toBe('onemap');
  });

  test('OneMap unreachable falls back to Carto, then to outlines only', () => {
    const carto = run(errors(MAX_TILE_ERRORS));
    expect(carto.basemap).toBe('carto');
    expect(run(errors(MAX_TILE_ERRORS, 'carto'), carto).basemap).toBe('none');
  });

  test('errors after a tile has loaded are ignored', () => {
    expect(run([loaded(), ...errors(10)]).basemap).toBe('onemap');
  });

  test('late OneMap errors are not counted against Carto', () => {
    const carto = run(errors(MAX_TILE_ERRORS));
    expect(run(errors(10, 'onemap'), carto)).toEqual(carto);
  });

  test("Carto's style failing to load goes straight to outlines only", () => {
    const carto = run(errors(MAX_TILE_ERRORS));
    expect(onTileEvent(carto, { type: 'style-error', basemap: 'carto' }).basemap).toBe('none');
  });

  test('Carto loading stops the fallback', () => {
    const carto = run([...errors(MAX_TILE_ERRORS), loaded('carto'), ...errors(10, 'carto')]);
    expect(carto.basemap).toBe('carto');
  });
});

describe('basemap styles', () => {
  test('OneMap and outlines-only start with the background, so the map reads with no tiles', () => {
    for (const b of ['onemap', 'none'] as const) expect(styleFor(b).layers[0].type).toBe('background');
  });

  test('OneMap is credited', () => {
    expect(JSON.stringify(styleFor('onemap'))).toContain('OneMap');
  });

  test('outlines-only has no tile source', () => {
    expect(styleFor('none').sources).toEqual({});
  });

  test("Carto's sources are renamed so their tile events map back to Carto", () => {
    const positron: StyleSpecification = {
      version: 8,
      sources: { protomaps: { type: 'vector', tiles: ['https://example.test/{z}/{x}/{y}.mvt'] } },
      layers: [
        { id: 'background', type: 'background' },
        { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water' },
      ],
    };
    const adopted = cartoStyle(positron);
    expect(Object.keys(adopted.sources).map(basemapOfSource)).toEqual(['carto']);
    expect(adopted.layers[1]).toMatchObject({ id: 'water', source: Object.keys(adopted.sources)[0] });
    expect(adopted.layers[0]).toEqual(positron.layers[0]);
  });

  test("each style's tile source maps back to its basemap", () => {
    expect(Object.keys(styleFor('onemap').sources).map(basemapOfSource)).toEqual(['onemap']);
    expect(basemapOfSource('deck')).toBeNull();
    expect(basemapOfSource(undefined)).toBeNull();
  });
});
