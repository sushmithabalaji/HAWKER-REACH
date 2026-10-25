import { useState } from 'react';
import { TOP_AREAS } from './support';

// The support list's rows, already in order: the first few until the user asks for all of them.
export function useTopAreas<T>(rows: readonly T[]) {
  const [showAll, setShowAll] = useState(false);
  return {
    shown: showAll ? [...rows] : rows.slice(0, TOP_AREAS),
    showAll,
    toggle: () => setShowAll((v) => !v),
    canToggle: rows.length > TOP_AREAS,
  };
}
