import type { CentreClosureRow, ClosureWindow } from '@shared/closure-engine';

// The window the planner has typed in for one anchor. Either date can be empty while they are typing.
export interface WindowEdit {
  anchorId: string;
  from: string;
  to: string;
}

// The works the prefill follows. The candidate engine also drops centres with partial closures, but a partial closure
// is not a closure date for the anchor itself.
const SCHEDULED = new Set(['renovation', 'redevelopment']);

// Prefill (#60): the anchor's next scheduled renovation or redevelopment, the one that is under way or
// starts soonest. Null when it has none, so overlap is not checked until the planner enters dates.
export function suggestedWindow(closures: CentreClosureRow[], anchorId: string, today: string): ClosureWindow | null {
  const next = closures
    .filter((k) => k.centre_id === anchorId && SCHEDULED.has(k.type) && k.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.closure_id.localeCompare(b.closure_id))[0];
  return next ? { from: next.start_date, to: next.end_date } : null;
}

// Today's date where the planner is (YYYY-MM-DD), not UTC: early morning in Singapore is still yesterday in UTC.
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type WindowState =
  | { kind: 'none' }
  | { kind: 'incomplete' }
  | { kind: 'backwards' }
  | { kind: 'ok'; window: ClosureWindow };

// What the engine gets: the planner's own dates for this anchor if they have typed any, else the suggestion.
export function resolveWindow(
  edit: WindowEdit | null,
  anchorId: string,
  suggested: ClosureWindow | null
): {
  from: string;
  to: string;
  state: WindowState;
} {
  const from = edit?.anchorId === anchorId ? edit.from : (suggested?.from ?? '');
  const to = edit?.anchorId === anchorId ? edit.to : (suggested?.to ?? '');
  if (!from && !to) return { from, to, state: { kind: 'none' } };
  if (!from || !to) return { from, to, state: { kind: 'incomplete' } };
  if (from > to) return { from, to, state: { kind: 'backwards' } };
  return { from, to, state: { kind: 'ok', window: { from, to } } };
}
