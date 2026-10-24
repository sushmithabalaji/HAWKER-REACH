import type { Tier } from './scenario';

// Page 2's map colours, from the wireframe (docs/wireframes/v1/source/Seniors.dc.html). Colours both
// pages use are in components/shared/mapColours.ts.
export const TIER_HEX: Record<Tier, string> = { T1: '#2F86B0', T2: '#9CC8E0', T3: '#F0A35E', T4: '#B33A0B' };
export const MULTIPLIER_HEX = ['#FDF0E2', '#F9D2A8', '#F2A766', '#E06A2B', '#A93A0B'];
export const NOT_AFFECTED_HEX = '#C5CDD5';

// Temporary: Page 1 (#46) imports these from here. Remove once it imports components/shared/mapColours.
export { HIGHLIGHT_HEX as ACCENT_HEX, INK_HEX, rgb } from '@/components/shared/mapColours';
