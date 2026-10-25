import type { BlockOptionRow } from '@shared/closure-engine';

// Displaced blocks by estimated residents, from the wireframe (Feature1Ripple.dc.html). Smallest first.
export const BLOCK_BANDS = [
  { min: 0, hex: '#FDE7CF', label: 'under 250' },
  { min: 250, hex: '#F6B26B', label: '250–1,000' },
  { min: 1000, hex: '#E07B24', label: '1,000–2,500' },
  { min: 2500, hex: '#9C3D06', label: '2,500+' },
];

export interface BlockPoint {
  blockId: string;
  lon: number;
  lat: number;
  residents: number;
}

export const blockBand = (residents: number) => BLOCK_BANDS.filter((b) => residents >= b.min).pop()!;

// Each block's position and residents, for the displaced-blocks layer. block_options repeats a block
// once per centre within 2 km, so the first row stands for it.
export function blockPoints(rows: BlockOptionRow[]): Map<string, BlockPoint> {
  const points = new Map<string, BlockPoint>();
  for (const r of rows) {
    if (!points.has(r.block_id))
      points.set(r.block_id, { blockId: r.block_id, lon: r.lon, lat: r.lat, residents: r.est_residents });
  }
  return points;
}
