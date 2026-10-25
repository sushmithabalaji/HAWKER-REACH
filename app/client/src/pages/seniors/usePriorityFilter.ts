import { useState } from 'react';

// The support list shows priority areas until the user asks for all of them
// (ASSUMPTIONS.md, priority areas). Null priority ids means the rule can't run yet (super-aged flags still
// loading or failed), so every area shows as before, with no toggle.
export function usePriorityFilter<T extends { subzone_id: string }>(
  areas: readonly T[],
  priorityIds: ReadonlySet<string> | null
) {
  const [showAll, setShowAll] = useState(false);
  const isPriority = (a: T) => priorityIds === null || priorityIds.has(a.subzone_id);
  const priority = areas.filter(isPriority);
  return {
    shown: showAll ? areas : priority,
    showAll,
    toggle: () => setShowAll((v) => !v),
    canToggle: areas.length > priority.length,
    noneUrgent: areas.length > 0 && priority.length === 0 && !showAll,
    // Non-priority rows are muted when shown.
    muted: (a: T) => (isPriority(a) ? '' : 'opacity-60'),
  };
}
