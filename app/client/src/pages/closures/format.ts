import type { Receiver } from '@shared/closure-engine';

// Number formats shared by Page 1's takeaway, tiles and map labels.
export const count = (n: number) => n.toLocaleString('en-US');
// Diners and residents are modelled, so they are shown to the nearest 10 (see the Assumptions panel).
export const roundTo10 = (n: number) => Math.round(n / 10) * 10;
// % over a centre's modelled diners today; "new" when it has none (#11, Load).
export const pctOverBaseline = (pct: Receiver['pctOverBaseline']) => (pct === 'new' ? 'new' : `+${Math.round(pct)}%`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, text: `${d} ${MONTHS[m - 1]}` };
};

// "14 Sep – 13 Dec 2026", or across years "1 Dec 2026 – 31 Mar 2027", from YYYY-MM-DD dates.
export function period(startDate: string, endDate: string): string {
  const a = day(startDate);
  const b = day(endDate);
  return a.y === b.y ? `${a.text} – ${b.text} ${b.y}` : `${a.text} ${a.y} – ${b.text} ${b.y}`;
}
