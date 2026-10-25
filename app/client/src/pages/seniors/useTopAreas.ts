import { useState } from 'react';
import { rankAreas, TOP_AREAS } from './support';

// The support list's rows: the top areas (priority first) until the user asks for all of them.
export function useTopAreas<T extends { subzone_id: string }>(
  areas: readonly T[],
  priorityIds: ReadonlySet<string> | null
) {
  const [showAll, setShowAll] = useState(false);
  const ranked = rankAreas(areas, priorityIds);
  return {
    shown: showAll ? ranked : ranked.slice(0, TOP_AREAS),
    showAll,
    toggle: () => setShowAll((v) => !v),
    canToggle: ranked.length > TOP_AREAS,
  };
}
