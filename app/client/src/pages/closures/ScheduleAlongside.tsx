import { useMemo, useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { assumptions } from '@shared/assumptions';
import { findCandidates, type GoldData } from '@shared/closure-engine';
import { resolveWindow, suggestedWindow, type WindowEdit } from './closureWindow';
import { closurePeriod } from './format';
import { candidateRowView } from './scheduleView';

const DATE_INPUT = 'rounded-md border border-input bg-card px-2 py-1 text-sm';
const HEAD = 'border-b-2 border-foreground px-3 py-2';

// The "Centres to close in the same window" section (#54, #72, #94): the top centres that could close at the
// same time as the plan, ranked by R&R need, and the closure window they are checked against.
export function ScheduleAlongside({
  data,
  anchorId,
  selectedIds,
  edit,
  onEdit,
  onAdd,
  today,
}: {
  data: GoldData;
  anchorId: string;
  selectedIds: string[];
  edit: WindowEdit | null;
  /** Null goes back to the scheduled dates. */
  onEdit: (edit: WindowEdit | null) => void;
  onAdd: (centreId: string) => void;
  /** YYYY-MM-DD */
  today: string;
}) {
  const suggested = useMemo(() => suggestedWindow(data.centreClosures, anchorId, today), [data, anchorId, today]);
  const { from, to, state } = resolveWindow(edit, anchorId, suggested);
  const closureWindow = state.kind === 'ok' ? state.window : null;

  const result = useMemo(
    () => findCandidates(data, anchorId, selectedIds, closureWindow, today, assumptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, anchorId, selectedIds, closureWindow?.from, closureWindow?.to, today]
  );
  const rows = result.candidates.map((c) => candidateRowView(c, result));
  // The window reads as one line; the date pickers show on "Change", or when there is no usable window.
  const [changingFor, setChangingFor] = useState<string | null>(null);
  const showPickers = changingFor === anchorId || !closureWindow;
  const ownDates = edit?.anchorId === anchorId;
  // Typing keeps the pickers open until Done, even once the dates make a usable window.
  const change = (next: WindowEdit) => {
    setChangingFor(anchorId);
    onEdit(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {showPickers ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Anchor closes from
            <input
              type="date"
              className={DATE_INPUT}
              value={from}
              onChange={(e) => change({ anchorId, from: e.target.value, to })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            to
            <input
              type="date"
              className={DATE_INPUT}
              value={to}
              onChange={(e) => change({ anchorId, from, to: e.target.value })}
            />
          </label>
          {closureWindow && (
            <Button size="sm" onClick={() => setChangingFor(null)}>
              Done
            </Button>
          )}
          {suggested && ownDates && (
            <Button variant="outline" size="sm" onClick={() => onEdit(null)}>
              Use scheduled dates
            </Button>
          )}
          {!suggested && !ownDates && (
            <span className="text-xs text-muted-foreground">No scheduled works for the anchor: enter dates.</span>
          )}
        </div>
      ) : (
        <p className="text-sm">
          Window: <strong>{closurePeriod(closureWindow.from, closureWindow.to)}</strong>{' '}
          <span className="text-muted-foreground">({ownDates ? 'your dates' : 'NEA schedule'})</span> ·{' '}
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setChangingFor(anchorId)}>
            Change
          </Button>
        </p>
      )}
      {state.kind === 'incomplete' && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Enter both dates to check for overlaps.
        </p>
      )}
      {state.kind === 'backwards' && (
        <p role="alert" className="text-sm font-medium text-destructive">
          The end date is before the start date.
        </p>
      )}

      {result.planFull ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          The plan already has the most centres it can hold. Remove one to see more candidates.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          No centre can close with the plan in this window.
        </p>
      ) : (
        <>
          {!result.overlapChecked && (
            <p className="text-xs text-muted-foreground">Overlap not checked: enter dates to compare closures.</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground">
                  <th className={HEAD}>CENTRE</th>
                  <th className={HEAD}>LAST R&amp;R</th>
                  <th className={HEAD}>SENIORS CUT OFF</th>
                  <th className={HEAD}>DINERS DISPLACED A DAY</th>
                  <th className={HEAD}>CLOSURES IN WINDOW</th>
                  <th className={HEAD}>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.centreId} className="border-b">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 font-mono">{r.lastRR}</td>
                    <td className="px-3 py-2 font-mono">{r.seniorsCutOff}</td>
                    <td className="px-3 py-2 font-mono">{r.dinersDisplaced}</td>
                    <td className="px-3 py-2 font-mono">{r.closuresInWindow}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => onAdd(r.centreId)}>
                        Add to plan
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
