import type { BlockOptionRow } from '@shared/closure-engine';

export interface BlockPoint {
  blockId: string;
  lon: number;
  lat: number;
  residents: number;
}

// Each block's position and residents, for the access-loss layer. block_options repeats a block
// once per centre within 2 km, so the first row stands for it.
export function blockPoints(rows: BlockOptionRow[]): Map<string, BlockPoint> {
  const points = new Map<string, BlockPoint>();
  for (const r of rows) {
    if (!points.has(r.block_id))
      points.set(r.block_id, { blockId: r.block_id, lon: r.lon, lat: r.lat, residents: r.est_residents });
  }
  return points;
}
