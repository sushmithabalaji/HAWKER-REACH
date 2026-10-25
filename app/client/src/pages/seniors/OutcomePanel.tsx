import { Skeleton } from '@databricks/appkit-ui/react';
import { Panel, PanelContent } from '@/components/shared/Panel';
import { shortName, type Centre } from '@/components/shared/centres';
import { closureLabel, dateRange, type NeaClosure } from './closures';
import { roughCount, type Severity, type Summary } from './scenario';
import { LIMIT_MIN } from './settings';
import { ACCESS_LEVELS, type AccessLevel, type LevelShift } from './legend';

interface OutcomePanelProps {
  centre: Centre | null;
  picked: NeaClosure | null;
  // Works closures near the picked one during its dates, which count as closed.
  alongside: NeaClosure[];
  summary: Summary | null;
  shifts: LevelShift[]; // seniors moving between access levels, for blocks whose nearest centre closed
  priorityAreas: number | null; // null until the super-aged flags load
  severity: Severity | null; // null with no senior cut off, or until priority areas are known
  severityPending: boolean; // the share aged 65+ is still loading or failed, so severity can't be worked out
  loading: boolean;
}

// An estimate of seniors in a sentence: "about 1,235", or "<5" and "0" as they are.
const seniorsInWords = (n: number) => {
  const text = roughCount(n);
  return /^[1-9]/.test(text) ? `about ${text}` : text;
};

const SEVERITY_STYLE: Record<Severity, string> = {
  Severe: 'bg-highlight text-white',
  Moderate: 'bg-highlight-tint text-highlight',
  Low: 'bg-muted text-foreground',
};

// 1 · What's closing.
function ClosingCard({
  centre,
  picked,
  alongside,
}: Pick<OutcomePanelProps, 'picked' | 'alongside'> & { centre: Centre }) {
  return (
    <section className="rounded-xl bg-topbar px-panel py-4 text-topbar-strong">
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">Closing</div>
      <div className="text-xl font-semibold leading-snug">{shortName(centre.name)}</div>
      <div className="text-sm opacity-80">
        {picked ? (
          <>
            {picked.type} · {dateRange(picked)} · {picked.duration_days} days
          </>
        ) : (
          'Closed on the map to test it'
        )}
      </div>
      {alongside.length > 0 && (
        <div className="mt-1 text-xs opacity-80">Also closed then: {alongside.map(closureLabel).join('; ')}</div>
      )}
    </section>
  );
}

// 2 · Impact on seniors.
function ImpactCard({ summary }: { summary: Summary }) {
  const cutOff = summary.groups['cut-off'];
  return (
    <Panel>
      <PanelContent className="gap-1">
        {cutOff.seniors === 0 ? (
          <p className="text-base font-medium">
            No senior loses a {LIMIT_MIN}-min walk. Another centre is close enough.
          </p>
        ) : (
          <>
            <div className="font-mono text-4xl font-semibold leading-none text-highlight">
              {roughCount(cutOff.seniors)}
            </div>
            <div className="text-base font-medium">seniors lose a {LIMIT_MIN}-min walk to a hawker centre</div>
            <div className="text-sm text-muted-foreground">
              {summary.noOneCanWalk.blocks > 0 ? (
                <>{seniorsInWords(summary.noOneCanWalk.seniors)} of them have no centre anyone can walk to.</>
              ) : (
                <>Each of them can still reach a centre in {LIMIT_MIN} min at a typical or brisk pace.</>
              )}
            </div>
          </>
        )}
      </PanelContent>
    </Panel>
  );
}

function LevelChip({ level }: { level: AccessLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-sm"
        style={{ background: ACCESS_LEVELS[level].hex, border: '1px solid rgb(0 0 0 / 0.35)' }}
      />
      {ACCESS_LEVELS[level].label}
    </span>
  );
}

// 2b · Where their walk moves: seniors by access level before → after, with a bar for each share.
function ShiftsCard({ shifts }: { shifts: LevelShift[] }) {
  const most = Math.max(...shifts.map((s) => s.seniors));
  return (
    <Panel>
      <PanelContent className="gap-2">
        <div className="text-sm font-medium">Access before → after</div>
        <ul className="flex flex-col gap-2">
          {shifts.map((s) => (
            <li key={`${s.from}>${s.to}`} className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-2">
              <LevelChip level={s.from} />
              <span aria-label="to">→</span>
              <LevelChip level={s.to} />
              <span className="h-2 rounded-full bg-muted">
                <span
                  className="block h-2 rounded-full"
                  style={{ width: `${(s.seniors / most) * 100}%`, background: ACCESS_LEVELS[s.to].hex }}
                />
              </span>
              <span className="text-right font-mono text-sm font-semibold">{roughCount(s.seniors)}</span>
            </li>
          ))}
        </ul>
      </PanelContent>
    </Panel>
  );
}

// 3 · How serious.
function SeverityCard({ severity, priorityAreas }: { severity: Severity; priorityAreas: number }) {
  return (
    <Panel>
      <PanelContent className="flex-row items-center gap-3">
        <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${SEVERITY_STYLE[severity]}`}>{severity}</span>
        <span className="text-sm">
          <strong className="font-mono">{priorityAreas}</strong>{' '}
          {priorityAreas === 1 ? 'priority area needs' : 'priority areas need'} help first
        </span>
      </PanelContent>
    </Panel>
  );
}

// The right-hand column of Page 2, in the order a reader needs it: what's closing, the impact on seniors,
// where their walk moves, and how serious it is. What to do is in the support list below the map.
export function OutcomePanel({
  centre,
  picked,
  alongside,
  summary,
  shifts,
  priorityAreas,
  severity,
  severityPending,
  loading,
}: OutcomePanelProps) {
  if (loading) {
    return (
      <div role="status">
        <Skeleton className="h-40 w-full rounded-xl" />
        <span className="sr-only">Loading blocks…</span>
      </div>
    );
  }
  if (!centre || !summary) {
    return (
      <section className="rounded-xl bg-topbar px-panel py-4 text-lg font-medium leading-snug text-topbar-strong">
        Pick a real NEA closure above, or click any hawker centre on the map to close it.
      </section>
    );
  }
  return (
    <>
      <ClosingCard centre={centre} picked={picked} alongside={alongside} />
      <ImpactCard summary={summary} />
      {shifts.length > 0 && <ShiftsCard shifts={shifts} />}
      {severity && priorityAreas !== null && <SeverityCard severity={severity} priorityAreas={priorityAreas} />}
      {severityPending && summary.groups['cut-off'].seniors > 0 && (
        <p className="text-sm text-muted-foreground">How serious this is shows once the share aged 65+ has loaded.</p>
      )}
    </>
  );
}
