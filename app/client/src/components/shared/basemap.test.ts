import { describe, expect, test } from 'vitest';
import { INITIAL_TILES, MAX_TILE_ERRORS, onTileEvent, styleFor, type TileEvent, type TileState } from './basemap';

const error: TileEvent = { type: 'tile-error' };
const loaded: TileEvent = { type: 'tile-loaded' };
const run = (events: TileEvent[], from: TileState = INITIAL_TILES) => events.reduce(onTileEvent, from);
const errors = (n: number) => Array<TileEvent>(n).fill(error);

describe('basemap fallback', () => {
  test('starts on OneMap', () => {
    expect(INITIAL_TILES.basemap).toBe('onemap');
  });

  test('a few errors before any tile loads keep OneMap', () => {
    expect(run(errors(MAX_TILE_ERRORS - 1)).basemap).toBe('onemap');
  });

  test('OneMap unreachable falls back to Carto, then to outlines only', () => {
    expect(run(errors(MAX_TILE_ERRORS)).basemap).toBe('carto');
    expect(run(errors(2 * MAX_TILE_ERRORS)).basemap).toBe('none');
    expect(run(errors(5 * MAX_TILE_ERRORS)).basemap).toBe('none');
  });

  test('errors after a tile has loaded are ignored', () => {
    expect(run([loaded, ...errors(10)]).basemap).toBe('onemap');
  });

  test('Carto gets its own count of errors', () => {
    const carto = run(errors(MAX_TILE_ERRORS));
    expect(run(errors(MAX_TILE_ERRORS - 1), carto).basemap).toBe('carto');
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
});
