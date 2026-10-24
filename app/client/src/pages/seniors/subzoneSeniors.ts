import { toBoolean, toNumberOrNull, toText, type RawRow } from '@/components/shared/queryValues';

// A row of gold.subzone_seniors (config/queries/seniors_subzones.sql).
export interface SubzoneSeniors {
  subzone_id: string;
  subzone_name: string;
  pln_area_n: string;
  // Null for subzones under access.min_subzone_residents HDB residents.
  pct_65p: number | null;
  multiplier: number | null;
  is_super_aged: boolean;
}

export function toSubzoneSeniors(row: RawRow): SubzoneSeniors {
  return {
    subzone_id: toText(row.subzone_id),
    subzone_name: toText(row.subzone_name ?? ''),
    pln_area_n: toText(row.pln_area_n ?? ''),
    pct_65p: toNumberOrNull(row.pct_65p),
    multiplier: toNumberOrNull(row.multiplier),
    is_super_aged: toBoolean(row.is_super_aged ?? false),
  };
}

// Bands for the vulnerability multiplier map, as in the wireframe: under ×0.6, then up to ×0.85, ×1.1, ×1.35, and above.
export const MULTIPLIER_BREAKS = [0.6, 0.85, 1.1, 1.35];

export function multiplierBand(multiplier: number | null): number | null {
  if (multiplier === null) return null;
  const i = MULTIPLIER_BREAKS.findIndex((b) => multiplier < b);
  return i === -1 ? MULTIPLIER_BREAKS.length : i;
}

export function multiplierBandLabel(band: number): string {
  const lo = MULTIPLIER_BREAKS[band - 1];
  const hi = MULTIPLIER_BREAKS[band];
  if (lo === undefined) return `under ×${hi}`;
  if (hi === undefined) return `×${lo}+`;
  return `×${lo}–${hi}`;
}
