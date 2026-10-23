import { describe, expect, test } from 'vitest';
import {
  basemapOfSource,
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

  test('Carto loading stops the fallback', () => {
    const carto = run([...errors(MAX_TILE_ERRORS), loaded('carto'), ...errors(10, 'carto')]);
    expect(carto.basemap).toBe('carto');
  });
});

describe('basemap styles', () => {
  test('every style has the background, so the map reads with no tiles', () => {
    for (const b of ['onemap', 'carto', 'none'] as const) expect(styleFor(b).layers[0].type).toBe('background');
  });

  test('OneMap and Carto are credited', () => {
    expect(JSON.stringify(styleFor('onemap'))).toContain('OneMap');
    expect(JSON.stringify(styleFor('carto'))).toContain('CARTO');
  });

  test('outlines-only has no tile source', () => {
    expect(styleFor('none').sources).toEqual({});
  });

  test("each style's tile source maps back to its basemap", () => {
    for (const b of ['onemap', 'carto'] as const) {
      expect(Object.keys(styleFor(b).sources).map(basemapOfSource)).toEqual([b]);
    }
    expect(basemapOfSource('deck')).toBeNull();
    expect(basemapOfSource(undefined)).toBeNull();
  });
});
