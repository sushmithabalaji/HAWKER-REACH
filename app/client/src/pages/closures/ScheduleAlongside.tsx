import { useMemo } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { assumptions } from '@shared/assumptions';
import { findCandidates, type ClosureWindow, type GoldData } from '@shared/closure-engine';
import { candidateRowView } from './scheduleView';

const HEAD = 'border-b-2 border-foreground px-3 py-2';

// The "Centres to close in the same window" section (#54, #72, #94): the top centres that could close at the
// same time as the plan, ranked by R&R need, checked against the anchor's closure window (set under the anchor search).
export function ScheduleAlongside({
  data,
  anchorId,
  selectedIds,
  closureWindow,
  onAdd,
  today,
}: {
  data: GoldData;
  anchorId: string;
  selectedIds: string[];
  /** Null when there is no usable window, so overlaps are not checked. */
  closureWindow: ClosureWindow | null;
  onAdd: (centreId: string) => void;
  /** YYYY-MM-DD */
  today: string;
}) {
  const result = useMemo(
    () => findCandidates(data, anchorId, selectedIds, closureWindow, today, assumptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, anchorId, selectedIds, closureWindow?.from, closureWindow?.to, today]
  );
  const rows = result.candidates.map((c) => candidateRowView(c, result));

  return (
    <div className="flex flex-col gap-3">
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
            <p className="text-xs text-muted-foreground">
              Closures in the window aren&rsquo;t checked yet: enter the anchor&rsquo;s closure dates under the search
              box at the top.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
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
