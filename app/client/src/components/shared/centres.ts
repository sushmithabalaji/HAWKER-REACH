import { toBoolean, toNumber, toText, type RawRow } from './queryValues';

// A centre from gold.centres (config/queries/shared_centres.sql), parsed by toCentre.
export interface Centre {
  centre_id: string;
  name: string;
  lon: number;
  lat: number;
  is_interim: boolean;
  pln_area_n: string;
}

export function toCentre(row: RawRow): Centre {
  return {
    centre_id: toText(row.centre_id),
    name: toText(row.name),
    lon: toNumber(row.lon),
    lat: toNumber(row.lat),
    is_interim: toBoolean(row.is_interim),
    pln_area_n: toText(row.pln_area_n),
  };
}

// Interim centres stay open and take diners from a closure, but can't be picked as the centre to close.
export function canClose(centre: Centre): boolean {
  return !centre.is_interim;
}

// Why a centre can't be picked, or null if it can. The same rule applies to a pick from CentreSearch
// and a click on the map. `excluded` holds centres the page has already used, e.g. Page 1's anchor
// and the centres added to close with it.
export function whyNotPickable(centre: Centre, excluded: readonly string[] = []): string | null {
  if (!canClose(centre)) return 'Interim, stays open';
  if (excluded.includes(centre.centre_id)) return 'Already picked';
  return null;
}

export function canPick(centre: Centre, excluded: readonly string[] = []): boolean {
  return whyNotPickable(centre, excluded) === null;
}

// Planning areas come in upper case ("ANG MO KIO"); towns are shown in title case ("Ang Mo Kio").
export function townLabel(plnArea: string): string {
  return plnArea.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function townsOf(centres: Centre[]): string[] {
  return [...new Set(centres.map((c) => c.pln_area_n))].sort();
}

// Typeahead: every word typed must start a word of the centre's name or town, in any order.
// Closable centres come first, then by name.
export function searchCentres(centres: Centre[], query: string, town: string | null = null): Centre[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return centres
    .filter((c) => town === null || c.pln_area_n === town)
    .filter((c) => {
      const haystack = `${c.name} ${c.pln_area_n}`.toLowerCase().split(/[^a-z0-9]+/);
      return words.every((w) => haystack.some((h) => h.startsWith(w)));
    })
    .sort((a, b) => Number(canClose(b)) - Number(canClose(a)) || a.name.localeCompare(b.name));
}
