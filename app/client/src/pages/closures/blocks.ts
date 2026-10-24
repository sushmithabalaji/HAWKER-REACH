import type { BlockOptionRow } from '@shared/closure-engine';

// Displaced blocks by estimated residents, from the wireframe (Feature1Ripple.dc.html).
export const BLOCK_BINS = [250, 1000, 2500];
export const BLOCK_HEX = ['#FDE7CF', '#F6B26B', '#E07B24', '#9C3D06'];
export const BLOCK_LABELS = ['under 250', '250–1,000', '1,000–2,500', '2,500+'];

export interface BlockPoint {
  blockId: string;
  lon: number;
  lat: number;
  residents: number;
}

export const blockBin = (residents: number) => BLOCK_BINS.filter((b) => residents >= b).length;

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
