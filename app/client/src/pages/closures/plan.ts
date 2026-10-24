import type { CentreRow } from '@shared/closure-engine';

// What the planner has picked: the anchor, and the centres closing at the same time, in the order added.
export interface Plan {
  anchorId: string | null;
  selectedIds: string[];
}

export const EMPTY_PLAN: Plan = { anchorId: null, selectedIds: [] };

// Add a centre to close alongside the anchor (#11, stories 4, 5 and 7). The anchor, a centre already
// added and interim centres are skipped; past the limit the plan stays as it is, with a message.
export function addToPlan(
  plan: Plan,
  centre: Pick<CentreRow, 'centre_id' | 'is_interim'>,
  maxSelected: number
): { plan: Plan; message: string | null } {
  const id = centre.centre_id;
  if (centre.is_interim || id === plan.anchorId || plan.selectedIds.includes(id)) return { plan, message: null };
  if (plan.selectedIds.length >= maxSelected) {
    return { plan, message: `Up to ${maxSelected} at once. Remove one to add another.` };
  }
  return { plan: { ...plan, selectedIds: [...plan.selectedIds, id] }, message: null };
}

export function removeFromPlan(plan: Plan, centreId: string): Plan {
  return { ...plan, selectedIds: plan.selectedIds.filter((id) => id !== centreId) };
}

export function withAnchor(plan: Plan, anchorId: string): Plan {
  return { anchorId, selectedIds: plan.selectedIds.filter((id) => id !== anchorId) };
}
