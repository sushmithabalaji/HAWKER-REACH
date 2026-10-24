import type { Color } from '@deck.gl/core';

// Map colours for deck.gl, which can't read CSS variables. These repeat the theme in index.css
// (--highlight and --foreground); mapColours.test.ts fails if the two drift apart.
export const HIGHLIGHT_HEX = '#a8380a';
export const INK_HEX = '#16202a';
// Interim centres: open, but not ones you can close.
export const INTERIM_HEX = '#7a8794';
export const WHITE_HEX = '#ffffff';

export function rgb(hex: string, alpha = 255): Color {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}
