import { useMemo } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { assumedNumber, assumptions } from '@shared/assumptions';
import { findCandidates, type GoldData } from '@shared/closure-engine';
import { TagBadge } from '@/components/shared/TagBadge';
import { resolveWindow, suggestedWindow, type WindowEdit } from './closureWindow';
import { candidateRowView } from './scheduleView';
import { TONE_CLASS } from './verdicts';

const CUTOFF_KM = assumedNumber('walk.cutoff_m') / 1000;
const DATE_INPUT = 'rounded-md border border-input bg-card px-2 py-1 text-sm';

// The "Schedule alongside" tab (#54): centres that could close at the same time as the plan, and the
// closure window they are checked against.
export function ScheduleTab({
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
  const currentYear = Number(today.slice(0, 4));

  const result = useMemo(
    () => findCandidates(data, anchorId, selectedIds, closureWindow, currentYear, assumptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, anchorId, selectedIds, closureWindow?.from, closureWindow?.to, currentYear]
  );
  const rows = result.candidates.map(candidateRowView);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Anchor closes from
          <input
            type="date"
            className={DATE_INPUT}
            value={from}
            onChange={(e) => onEdit({ anchorId, from: e.target.value, to })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          to
          <input
            type="date"
            className={DATE_INPUT}
            value={to}
            onChange={(e) => onEdit({ anchorId, from, to: e.target.value })}
          />
        </label>
        <Button variant="outline" size="sm" onClick={() => onEdit({ anchorId, from: '', to: '' })}>
          Clear dates
        </Button>
        {suggested && edit?.anchorId === anchorId && (
          <Button variant="outline" size="sm" onClick={() => onEdit(null)}>
            Use scheduled dates
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {edit?.anchorId === anchorId
            ? 'Your dates.'
            : suggested
              ? "Prefilled from the anchor's next scheduled works (NEA schedule)."
              : 'The anchor has no scheduled works, so enter dates to check for overlaps.'}
        </span>
      </div>
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
          No centre to suggest. Within {CUTOFF_KM} km of the anchor, every other centre is interim, already in the plan,
          has works in the window, or would get a red verdict, or there is none nearby.
        </p>
      ) : (
        <>
          {!result.overlapChecked && (
            <p className="text-xs text-muted-foreground">Overlap not checked: enter dates to compare closures.</p>
          )}
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.centreId}
                className={`flex flex-col gap-1 rounded-md border-l-4 bg-muted/40 p-3 ${TONE_CLASS[r.status].border}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{r.name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${TONE_CLASS[r.status].text}`}
                  >
                    <span aria-hidden>{r.icon}</span>
                    {r.word}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {r.distance} away, in a straight line
                    <TagBadge tag="MEASURED" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {r.age}
                    <TagBadge tag="MEASURED" />
                  </span>
                  <span className="ml-auto">
                    <Button size="sm" variant="outline" onClick={() => onAdd(r.centreId)}>
                      Add to plan
                    </Button>
                  </span>
                </div>
                {r.status === 'yellow' && (
                  <p className="text-sm">
                    {r.reason}
                    <TagBadge tag="MODELLED" />
                  </p>
                )}
                {r.cleaningNotes.map((note) => (
                  <p key={note} className="text-xs text-muted-foreground">
                    {note}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Centres within {CUTOFF_KM} km (straight line) of the anchor, with no renovation, redevelopment or partial
        closure in the window, that get a green verdict if added to the plan. Oldest first, then nearest; a centre’s age
        is a stand-in for how much maintenance it may need, not the time since its last works. Yellow centres only fill
        any gap. Reads gold.centres · gold.centre_closures · gold.block_options.
      </p>
    </div>
  );
}
