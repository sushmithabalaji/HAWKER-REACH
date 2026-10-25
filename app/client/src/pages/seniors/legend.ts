import type { Tier } from './scenario';
import { LIMIT_MIN } from './settings';

// Page 2's map legends: the colour and plain words for each access level and vulnerability band, chosen
// in #75 (ASSUMPTIONS.md, map legends). Colours both pages use are in components/shared/mapColours.ts.

// Three levels of concern, so the map reads normal / concerning / highly vulnerable at a glance. T2 and T3
// share one level; the tier codes stay in the model, tooltip and CSV.
export type AccessLevel = 'ok' | 'concerning' | 'vulnerable';
export const ACCESS_LEVELS: Record<AccessLevel, { label: string; meaning: string; hex: string }> = {
  ok: { label: 'OK', meaning: `a senior can walk there in ${LIMIT_MIN} min`, hex: '#2F86B0' },
  concerning: { label: 'Concerning', meaning: 'too far for a senior to walk', hex: '#F0A35E' },
  vulnerable: { label: 'Highly vulnerable', meaning: 'no one can walk there', hex: '#C0281C' },
};
export const TIER_LEVEL: Record<Tier, AccessLevel> = { T1: 'ok', T2: 'concerning', T3: 'concerning', T4: 'vulnerable' };
export const tierHex = (tier: Tier) => ACCESS_LEVELS[TIER_LEVEL[tier]].hex;

// One entry per multiplierBand, low to high, on a purple ramp that gets stronger as the multiplier goes
// up and can't be mistaken for the access colours.
export const MULTIPLIER_BANDS = [
  { name: 'Low vulnerability', hex: '#EEE6F4' },
  { name: 'Moderate', hex: '#C3A3DA' },
  { name: 'High', hex: '#8550B3' },
  { name: 'Extremely vulnerable', hex: '#4A1A75' },
];
export const NOT_AFFECTED_HEX = '#C5CDD5';
