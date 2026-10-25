// Hand-written row types for the gold tables Page 1 reads (columns as agreed in #11).
// Generated query types replace these once Spec 2's tables land.

/** `gold.block_options`: one row per HDB block × centre within 2 km. */
export interface BlockOptionRow {
  block_id: string;
  /** Null on the single row of a block with no centre within 2 km. */
  centre_id: string | null;
  walk_m: number | null;
  /** By `walk_m`, then `centre_id` ascending. */
  rank: number;
  lon: number;
  lat: number;
  subzone_id: string;
  est_residents: number;
  est_seniors: number;
  diners_per_day: number;
}

/** `gold.centres` (Spec 1). */
export interface CentreRow {
  centre_id: string;
  name: string;
  lon: number;
  lat: number;
  cooked_food_stalls: number;
  is_interim: boolean;
  pln_area_n: string;
  subzone_id: string;
  /** Year the centre opened; null where silver has none. */
  opening_year: number | null;
}

/** `gold.centre_demand` (Spec 2). */
export interface CentreDemandRow {
  centre_id: string;
  baseline_residents: number;
  baseline_diners_per_day: number;
  residents_per_stall: number;
  possibly_undercounted: boolean;
}

/** `gold.centre_closures` (Spec 1). Page 1 uses renovation and redevelopment only. */
export interface CentreClosureRow {
  closure_id: string;
  centre_id: string;
  type: 'cleaning' | 'renovation' | 'redevelopment' | 'partial';
  start_date: string;
  end_date: string;
  duration_days: number;
  remarks: string | null;
}

export interface GoldData {
  blockOptions: BlockOptionRow[];
  centres: CentreRow[];
  centreDemand: CentreDemandRow[];
  centreClosures: CentreClosureRow[];
}
