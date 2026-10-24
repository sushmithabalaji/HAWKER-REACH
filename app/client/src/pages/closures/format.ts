import type { Receiver } from '@shared/closure-engine';

// Number formats shared by Page 1's takeaway, tiles and map labels.
export const count = (n: number) => n.toLocaleString('en-US');
// Diners and residents are modelled, so they are shown to the nearest 10 (see the Assumptions panel).
export const roundTo10 = (n: number) => Math.round(n / 10) * 10;
// % over a centre's modelled diners today; "new" when it has none (#11, Load).
export const pctOverBaseline = (pct: Receiver['pctOverBaseline']) => (pct === 'new' ? 'new' : `+${Math.round(pct)}%`);
