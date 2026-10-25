import type { Tier } from './scenario';
import { LIMIT_MIN } from './settings';

// Page 2's map legends: the colour and plain words for each access level and vulnerability band, chosen
// in #75 (ASSUMPTIONS.md, map legends). Colours both pages use are in components/shared/mapColours.ts.

// Three levels of concern, so the map reads normal / concerning / highly vulnerable at a glance. T2 and T3
// share one level; the tier codes stay in the model, tooltip and CSV.
export type AccessLevel = 'ok' | 'concerning' | 'vulnerable';
export const ACCESS_LEVELS: Record<AccessLevel, { label: string; meaning: string; hex: string }> = {
  ok: { label: 'Accessible', meaning: `a senior can walk there in ${LIMIT_MIN} min`, hex: '#2F86B0' },
  concerning: { label: 'Concerning', meaning: 'too far for a senior to walk', hex: '#F0A35E' },
  vulnerable: { label: 'Highly vulnerable', meaning: 'no one can walk there', hex: '#C0281C' },
};
export const TIER_LEVEL: Record<Tier, AccessLevel> = { T1: 'ok', T2: 'concerning', T3: 'concerning', T4: 'vulnerable' };
export const tierHex = (tier: Tier) => ACCESS_LEVELS[TIER_LEVEL[tier]].hex;

// One entry per multiplierBand, low to high, on the app's orange ramp (the wireframe's), getting stronger
// as the multiplier goes up.
export const MULTIPLIER_BANDS = [
  { name: 'Low vulnerability', hex: '#FAE0C3' },
  { name: 'Moderate', hex: '#F2A766' },
  { name: 'High', hex: '#E06A2B' },
  { name: 'Extremely vulnerable', hex: '#A93A0B' },
];
export const NOT_AFFECTED_HEX = '#C5CDD5';

// Whether the vulnerability view shades a subzone: every one with no closure picked, for an overview; with
// one, only those with seniors cut off, so the areas it hits stand out.
export function isShaded(subzoneId: string, closurePicked: boolean, cutOffIds: { has(id: string): boolean }): boolean {
  return !closurePicked || cutOffIds.has(subzoneId);
}
