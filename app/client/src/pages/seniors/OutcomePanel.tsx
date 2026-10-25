import { Skeleton } from '@databricks/appkit-ui/react';
import { Panel, PanelContent } from '@/components/shared/Panel';
import { shortName, type Centre } from '@/components/shared/centres';
import { QueryError } from '@/components/shared/QueryError';
import { TagBadge } from '@/components/shared/TagBadge';
import { closureLabel, dateRange, type NeaClosure } from './closures';
import { roughCount, type Count, type Severity, type Summary } from './scenario';
import { LIMIT_MIN } from './settings';

export interface Sensitivity {
  // Seniors cut off at each extra limit (access.sensitivity_limits_min), for the picked centre closing alone.
  cutOffAt: { limitMin: number; seniors: number }[];
  alone: boolean; // false when other closures overlap, which these figures leave out
  error: string | null;
}

interface OutcomePanelProps {
  centre: Centre | null;
  picked: NeaClosure | null;
  // Other closures near the picked one during its dates: works count as closed, cleaning as open.
  alongside: { works: NeaClosure[]; cleaning: NeaClosure[] };
  summary: Summary | null;
  priorityAreas: number | null; // null until the super-aged flags load
  severity: Severity | null; // null with no senior cut off, or until priority areas are known
  severityPending: boolean; // the share aged 65+ is still loading or failed, so severity can't be worked out
  sensitivity: Sensitivity | null;
  loading: boolean;
}

// An estimate of seniors in a sentence: "about 1,235", or "<5" and "0" as they are.
const seniorsInWords = (n: number) => {
  const text = roughCount(n);
  return /^[1-9]/.test(text) ? `about ${text}` : text;
};

const Modelled = () => <TagBadge tag="MODELLED" />;

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
            {picked.type} · {dateRange(picked)} · {picked.duration_days} days <TagBadge tag="MEASURED" />
          </>
        ) : (
          'Closed on the map to test it'
        )}
      </div>
      {alongside.works.length > 0 && (
        <div className="mt-1 text-xs opacity-80">
          Also closed then: {alongside.works.map(closureLabel).join('; ')} <TagBadge tag="MEASURED" />
        </div>
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
              <Modelled />
            </div>
            <div className="text-base font-medium">seniors lose a {LIMIT_MIN}-min walk to a hawker centre</div>
            <div className="text-sm text-muted-foreground">
              {summary.noOneCanWalk.blocks > 0 ? (
                <>
                  {seniorsInWords(summary.noOneCanWalk.seniors)} of them <Modelled /> have no centre anyone can walk to.
                </>
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

// 3 · How serious.
function SeverityCard({ severity, priorityAreas }: { severity: Severity; priorityAreas: number }) {
  return (
    <Panel>
      <PanelContent className="flex-row items-center gap-3">
        <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${SEVERITY_STYLE[severity]}`}>
          {severity}
          <TagBadge tag="ASSUMPTION" />
        </span>
        <span className="text-sm">
          <strong className="font-mono">{priorityAreas}</strong> <Modelled />{' '}
          {priorityAreas === 1 ? 'priority area needs' : 'priority areas need'} help first
        </span>
      </PanelContent>
    </Panel>
  );
}

function GroupRow({ title, rule, count, sub }: { title: string; rule: string; count: Count; sub?: boolean }) {
  return (
    <li className={`flex items-start gap-3 text-sm ${sub ? 'pl-5' : ''}`}>
      <span className="flex-1">
        <strong className={sub ? 'font-medium' : ''}>
          {sub && '↳ '}
          {title}
        </strong>{' '}
        <span className="text-muted-foreground">· {rule}</span>
      </span>
      <span className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
        {count.blocks.toLocaleString('en-US')} blocks · {roughCount(count.seniors)} seniors
        <Modelled />
      </span>
    </li>
  );
}

function SensitivityLine({ sensitivity }: { sensitivity: Sensitivity }) {
  if (sensitivity.cutOffAt.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {sensitivity.cutOffAt.map(({ limitMin, seniors }, i) => (
        <span key={limitMin}>
          {i === 0 ? `If the limit were ${limitMin} min, ` : `; at ${limitMin} min, `}
          {seniorsInWords(seniors)}
          {i === 0 && ' seniors'} <Modelled />
          {i === 0 && ' would be cut off'}
        </span>
      ))}
      .{!sensitivity.alone && ' These are for this centre closing alone.'}
    </p>
  );
}

// The outcome groups, the 10 and 20 min figures and cleaning nearby, for anyone checking the numbers.
function Details({
  centre,
  summary,
  sensitivity,
  cleaning,
}: {
  centre: Centre;
  summary: Summary;
  sensitivity: Sensitivity | null;
  cleaning: NeaClosure[];
}) {
  return (
    <details className="rounded-xl border bg-card px-panel py-3">
      <summary className="cursor-pointer text-sm font-medium">Details</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Blocks whose nearest centre was {shortName(centre.name)}</p>
        <ul className="flex flex-col gap-2">
          <GroupRow title="Cut off" rule="T1 → T2–T4" count={summary.groups['cut-off']} />
          <GroupRow sub title="No one can walk it" rule="T1 → T4" count={summary.noOneCanWalk} />
          <GroupRow title="Already without access" rule="T2–T4 before" count={summary.groups['already-without']} />
          <GroupRow sub title="Now worse" rule="T2/T3 → T4" count={summary.nowWorse} />
          <GroupRow title="Unaffected" rule="T1 → T1" count={summary.groups.unaffected} />
        </ul>
        {sensitivity && !sensitivity.error && <SensitivityLine sensitivity={sensitivity} />}
        {cleaning.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Cleaning nearby during these dates, counted as open: {cleaning.map(closureLabel).join('; ')}.
            <TagBadge tag="MEASURED" />
          </p>
        )}
      </div>
    </details>
  );
}

// The right-hand column of Page 2, in the order a reader needs it: what's closing, the impact on seniors,
// how serious it is, then (in AreasToAlert) what to do. The detail behind the numbers is behind "Details".
export function OutcomePanel({
  centre,
  picked,
  alongside,
  summary,
  priorityAreas,
  severity,
  severityPending,
  sensitivity,
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
      {severity && priorityAreas !== null && <SeverityCard severity={severity} priorityAreas={priorityAreas} />}
      {severityPending && summary.groups['cut-off'].seniors > 0 && (
        <p className="text-sm text-muted-foreground">How serious this is shows once the share aged 65+ has loaded.</p>
      )}
      {sensitivity?.error && <QueryError what="Other time limits" error={sensitivity.error} />}
      <Details centre={centre} summary={summary} sensitivity={sensitivity} cleaning={alongside.cleaning} />
    </>
  );
}
