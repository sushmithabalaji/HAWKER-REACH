import type { Color } from '@deck.gl/core';
import type { Tier } from './scenario';

// From the wireframe (docs/wireframes/v1/source/Seniors.dc.html).
export const TIER_HEX: Record<Tier, string> = { T1: '#2F86B0', T2: '#9CC8E0', T3: '#F0A35E', T4: '#B33A0B' };
export const MULTIPLIER_HEX = ['#FDF0E2', '#F9D2A8', '#F2A766', '#E06A2B', '#A93A0B'];
export const NOT_AFFECTED_HEX = '#C5CDD5';
export const ACCENT_HEX = '#A8380A';
export const INK_HEX = '#16202A';

export function rgb(hex: string, alpha = 255): Color {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}
