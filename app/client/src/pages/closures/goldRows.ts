import type { BlockOptionRow, CentreClosureRow, CentreDemandRow, CentreRow, GoldData } from '@shared/closure-engine';
import { isMissing, toBoolean, toNumber, toNumberOrNull, toText, type RawRow } from '@/components/shared/queryValues';

// The rows of Page 1's four queries (config/queries/closures_*.sql), as AppKit sends them.
export interface RawGoldData {
  blockOptions: RawRow[];
  centres: RawRow[];
  centreDemand: RawRow[];
  centreClosures: RawRow[];
}

function toBlockOption(r: RawRow): BlockOptionRow {
  return {
    block_id: toText(r.block_id),
    centre_id: isMissing(r.centre_id) ? null : toText(r.centre_id),
    walk_m: toNumberOrNull(r.walk_m),
    rank: toNumber(r.rank),
    lon: toNumber(r.lon),
    lat: toNumber(r.lat),
    subzone_id: toText(r.subzone_id),
    est_residents: toNumber(r.est_residents),
    est_seniors: toNumber(r.est_seniors),
    diners_per_day: toNumber(r.diners_per_day),
  };
}

function toCentreRow(r: RawRow): CentreRow {
  return {
    centre_id: toText(r.centre_id),
    name: toText(r.name),
    lon: toNumber(r.lon),
    lat: toNumber(r.lat),
    cooked_food_stalls: toNumber(r.cooked_food_stalls),
    is_interim: toBoolean(r.is_interim),
    pln_area_n: toText(r.pln_area_n),
    subzone_id: toText(r.subzone_id),
  };
}

function toCentreDemand(r: RawRow): CentreDemandRow {
  return {
    centre_id: toText(r.centre_id),
    baseline_residents: toNumber(r.baseline_residents),
    baseline_diners_per_day: toNumber(r.baseline_diners_per_day),
    residents_per_stall: toNumber(r.residents_per_stall),
    possibly_undercounted: toBoolean(r.possibly_undercounted),
  };
}

function toCentreClosure(r: RawRow): CentreClosureRow {
  return {
    closure_id: toText(r.closure_id),
    centre_id: toText(r.centre_id),
    type: toText(r.type) as CentreClosureRow['type'],
    start_date: toText(r.start_date),
    end_date: toText(r.end_date),
    duration_days: toNumber(r.duration_days),
    remarks: isMissing(r.remarks) ? null : toText(r.remarks),
  };
}

export function toGoldData(raw: RawGoldData): GoldData {
  return {
    blockOptions: raw.blockOptions.map(toBlockOption),
    centres: raw.centres.map(toCentreRow),
    centreDemand: raw.centreDemand.map(toCentreDemand),
    centreClosures: raw.centreClosures.map(toCentreClosure),
  };
}
