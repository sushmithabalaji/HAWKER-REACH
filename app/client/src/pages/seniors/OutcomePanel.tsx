import { Skeleton } from '@databricks/appkit-ui/react';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { shortName, type Centre } from '@/components/shared/centres';
import { closureLabel, dateRange, type NeaClosure } from './closures';
import { roughCount, type LevelShift, type Severity, type Summary } from './scenario';
import { LIMIT_MIN } from './settings';
import { ACCESS_LEVELS, type AccessLevel } from './legend';
import { Swatch } from './Swatch';

interface OutcomePanelProps {
  centre: Centre | null;
  picked: NeaClosure | null;
  // Works closures near the picked one during its dates, which count as closed.
  alongside: NeaClosure[];
  summary: Summary | null;
  shifts: LevelShift[]; // seniors moving between access levels, for blocks whose nearest centre closed
  // The priority areas, most seniors cut off first; null until the super-aged flags load.
  priorityList: { subzoneId: string; name: string; seniors: number }[] | null;
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
  // The same red / amber / green as the access levels and Page 1's verdicts (#114), always with the word.
  Severe: 'bg-status-red text-white',
  Moderate: 'bg-status-yellow text-white',
  Low: 'bg-status-green text-white',
};

// 1 · What's closing.
function ClosingCard({
  centre,
  picked,
  alongside,
}: Pick<OutcomePanelProps, 'picked' | 'alongside'> & { centre: Centre }) {
  return (
    <SummaryCard label="Closing" title={shortName(centre.name)}>
      <p>
        {picked ? (
          <>
            {picked.type} · {dateRange(picked)} · {picked.duration_days} days
          </>
        ) : (
          'Closed on the map to test it'
        )}
      </p>
      {alongside.length > 0 && <p>Also closed then: {alongside.map(closureLabel).join('; ')}</p>}
    </SummaryCard>
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
      <Swatch colour={ACCESS_LEVELS[level].hex} square />
      {ACCESS_LEVELS[level].label}
    </span>
  );
}

// 2b · Where their walk moves: seniors by access level before → after, with a bar for each share.
function ShiftsCard({ shifts }: { shifts: LevelShift[] }) {
  const most = Math.max(...shifts.map((s) => s.seniors)) || 1;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Access before → after</PanelTitle>
      </PanelHeader>
      <PanelContent className="gap-2">
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

// The first few priority areas named under the severity badge; the rest are in the support list.
const LISTED_AREAS = 6;

// 3 · How serious, and which areas need help first.
function SeverityCard({
  severity,
  priorityList,
}: {
  severity: Severity;
  priorityList: NonNullable<OutcomePanelProps['priorityList']>;
}) {
  const listed = priorityList.slice(0, LISTED_AREAS);
  const more = priorityList.length - listed.length;
  return (
    <Panel>
      <PanelContent className="gap-2">
        <div className="flex items-center gap-3">
          <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${SEVERITY_STYLE[severity]}`}>{severity}</span>
          <span className="text-sm">
            {priorityList.length === 0 ? (
              'No area needs urgent help'
            ) : (
              <>
                <strong className="font-mono">{priorityList.length}</strong>{' '}
                {priorityList.length === 1 ? 'priority area needs' : 'priority areas need'} help first
              </>
            )}
          </span>
        </div>
        {listed.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 font-medium">Priority area</th>
                <th className="py-1.5 text-right font-medium">Seniors cut off</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listed.map((a) => (
                <tr key={a.subzoneId}>
                  <td className="py-1.5 font-medium">{a.name}</td>
                  <td className="py-1.5 text-right">
                    <span className="font-mono font-semibold">{roughCount(a.seniors)}</span> seniors
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {more > 0 && (
          <a href="#support-list" className="text-sm font-medium underline underline-offset-2">
            and {more} more in the support list
          </a>
        )}
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
  priorityList,
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
      <SummaryCard label="Start here" title="Pick a real NEA closure above, or click any hawker centre on the map" />
    );
  }
  return (
    <>
      <ClosingCard centre={centre} picked={picked} alongside={alongside} />
      <ImpactCard summary={summary} />
      {shifts.length > 0 && <ShiftsCard shifts={shifts} />}
      {severity && priorityList !== null && <SeverityCard severity={severity} priorityList={priorityList} />}
      {severityPending && summary.groups['cut-off'].seniors > 0 && (
        <p className="text-sm text-muted-foreground">How serious this is shows once the share aged 65+ has loaded.</p>
      )}
    </>
  );
}
