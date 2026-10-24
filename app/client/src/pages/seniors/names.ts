import { shortName, type Centre } from '@/components/shared/centres';
import { CUTOFF_M } from './settings';

// How Page 2 names centres, subzones and walks, so the map, the lists and the CSV say the same thing.
export const NO_CENTRE = `no centre within ${CUTOFF_M / 1000} km`;

export const metres = (m: number) => `${(Math.round(m / 10) * 10).toLocaleString('en-US')} m`;

export interface Names {
  centre: (id: string | null) => string;
  subzone: (id: string) => string;
}

export function makeNames(centreById: ReadonlyMap<string, Centre>, subzoneNames: ReadonlyMap<string, string>): Names {
  return {
    centre: (id) => (id ? shortName(centreById.get(id)?.name ?? id) : NO_CENTRE),
    subzone: (id) => subzoneNames.get(id) ?? id,
  };
}
