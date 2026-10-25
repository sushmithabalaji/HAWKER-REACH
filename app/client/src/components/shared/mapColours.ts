import type { Color } from '@deck.gl/core';

// Map colours for deck.gl, which can't read CSS variables. These repeat the theme in index.css
// (--highlight, --brand and --foreground); mapColours.test.ts fails if the two drift apart.
export const HIGHLIGHT_HEX = '#b5321f';
// The brand orange, for lines and rings on the map; too light for small text.
export const BRAND_HEX = '#e94b35';
export const INK_HEX = '#382116';
// Interim centres: open, but not ones you can close. A warm grey.
export const INTERIM_HEX = '#8c7a6b';
export const WHITE_HEX = '#ffffff';

export function rgb(hex: string, alpha = 255): Color {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}
