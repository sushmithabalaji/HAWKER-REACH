import { useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import type { ClosureWindow } from '@shared/closure-engine';
import type { WindowEdit, WindowState } from './closureWindow';
import { closurePeriod } from './format';

// The two dates share one bordered strip, so they read as one range.
const DATE_INPUT = 'bg-transparent py-0.5 text-sm outline-none';

// The anchor's closure dates, attached under the anchor search (#101): one line with "Change", or one date-range
// strip when there is no usable window or the planner is changing it.
export function WindowControl({
  anchorId,
  suggested,
  edit,
  from,
  to,
  state,
  onEdit,
}: {
  anchorId: string;
  /** The anchor's next scheduled works, or null when it has none. */
  suggested: ClosureWindow | null;
  edit: WindowEdit | null;
  from: string;
  to: string;
  state: WindowState;
  /** Null goes back to the scheduled dates. */
  onEdit: (edit: WindowEdit | null) => void;
}) {
  const closureWindow = state.kind === 'ok' ? state.window : null;
  const [changingFor, setChangingFor] = useState<string | null>(null);
  const showPickers = changingFor === anchorId || !closureWindow;
  const ownDates = edit?.anchorId === anchorId;
  // Typing keeps the pickers open until Done, even once the dates make a usable window.
  const change = (next: WindowEdit) => {
    setChangingFor(anchorId);
    onEdit(next);
  };

  const link = 'h-auto p-0 text-sm';
  return (
    <div className="flex flex-col gap-1">
      {showPickers && !suggested && !ownDates && (
        <p className="text-sm">
          No closure is scheduled for this centre. Enter its closure dates to check which other centres are closed at
          the same time.
        </p>
      )}
      {showPickers ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">Closes</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-2 py-0.5">
            <input
              type="date"
              aria-label="Anchor closes from"
              className={DATE_INPUT}
              value={from}
              onChange={(e) => change({ anchorId, from: e.target.value, to })}
            />
            <span aria-hidden className="text-muted-foreground">
              –
            </span>
            <input
              type="date"
              aria-label="Anchor closes until"
              className={DATE_INPUT}
              value={to}
              onChange={(e) => change({ anchorId, from, to: e.target.value })}
            />
          </span>
          {closureWindow && (
            <Button variant="link" size="sm" className={link} onClick={() => setChangingFor(null)}>
              Done
            </Button>
          )}
          {suggested && ownDates && (
            <Button variant="link" size="sm" className={link} onClick={() => onEdit(null)}>
              Use NEA dates
            </Button>
          )}
        </div>
      ) : (
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <span aria-hidden>📅</span>
          <span className="text-muted-foreground">Closes</span>
          <strong>{closurePeriod(closureWindow.from, closureWindow.to)}</strong>
          <span className="text-muted-foreground">· {ownDates ? 'your dates' : 'NEA schedule'} ·</span>
          <Button
            variant="link"
            size="sm"
            className={link}
            aria-label="Change closure dates"
            onClick={() => setChangingFor(anchorId)}
          >
            Change
          </Button>
        </p>
      )}
      {state.kind === 'incomplete' && (
        <p role="alert" className="text-xs font-medium text-destructive">
          Enter both dates to check for overlaps.
        </p>
      )}
      {state.kind === 'backwards' && (
        <p role="alert" className="text-xs font-medium text-destructive">
          The end date is before the start date.
        </p>
      )}
    </div>
  );
}
