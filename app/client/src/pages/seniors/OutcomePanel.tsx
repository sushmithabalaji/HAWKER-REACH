import type { ReactNode } from 'react';
import { Skeleton } from '@databricks/appkit-ui/react';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { shortName, type Centre } from '@/components/shared/centres';
import { QueryError } from '@/components/shared/QueryError';
import { TagBadge } from '@/components/shared/TagBadge';
import type { NeaClosure } from './closures';
import { roughCount, type Count, type Summary } from './scenario';
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
  summary: Summary | null;
  priorityAreas: number | null; // null until the super-aged flags load
  sensitivity: Sensitivity | null;
  loading: boolean;
}

// An estimate of seniors in a sentence: "about 1,235", or "<5" and "0" as they are.
const seniorsInWords = (n: number) => {
  const text = roughCount(n);
  return /^[1-9]/.test(text) ? `about ${text}` : text;
};

const Modelled = () => <TagBadge tag="MODELLED" />;

function Headline({ centre, picked, summary }: Pick<OutcomePanelProps, 'centre' | 'picked' | 'summary'>) {
  if (!centre || !summary) {
    return <>Pick a real NEA closure above, or click any hawker centre on the map to close it.</>;
  }
  const closed = (
    <>
      {shortName(centre.name)} closed
      {picked && (
        <>
          {' '}
          for {picked.duration_days} days <TagBadge tag="MEASURED" />
        </>
      )}
    </>
  );
  const cutOff = summary.groups['cut-off'];
  if (cutOff.blocks === 0) {
    return (
      <>
        {closed}: no senior loses a {LIMIT_MIN}-min walk. Another centre is close enough.
      </>
    );
  }
  return (
    <>
      {closed}: {seniorsInWords(cutOff.seniors)} seniors <Modelled /> now walk over {LIMIT_MIN} min to a hawker centre.
      <span className="mt-2 block text-sm font-normal opacity-80">
        {summary.noOneCanWalk.blocks > 0 ? (
          <>
            {seniorsInWords(summary.noOneCanWalk.seniors)} of them <Modelled /> have no centre anyone can walk to in{' '}
            {LIMIT_MIN} min.
          </>
        ) : (
          <>Each of them can still reach a centre in {LIMIT_MIN} min at a typical or brisk pace.</>
        )}
      </span>
    </>
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

function Tile({ value, label, loading }: { value: ReactNode; label: string; loading: boolean }) {
  return (
    <Panel>
      <PanelContent className="gap-0 px-3.5">
        {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-mono text-2xl text-highlight">{value}</div>}
        <div className="text-sm text-muted-foreground">{label}</div>
      </PanelContent>
    </Panel>
  );
}

function SensitivityLine({ sensitivity }: { sensitivity: Sensitivity }) {
  if (sensitivity.error) return <QueryError what="Other time limits" error={sensitivity.error} />;
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

// The right-hand column of Page 2: headline, outcome groups, number tiles and the sensitivity line.
export function OutcomePanel({ centre, picked, summary, priorityAreas, sensitivity, loading }: OutcomePanelProps) {
  const shown = centre && summary;
  return (
    <>
      <section className="rounded-xl bg-topbar px-panel py-4 text-lg font-medium leading-snug text-topbar-strong">
        {loading ? 'Loading blocks…' : <Headline centre={centre} picked={picked} summary={summary} />}
      </section>

      {shown && (
        <Panel>
          <PanelHeader>
            <PanelTitle>Blocks whose nearest centre was {shortName(centre.name)}</PanelTitle>
          </PanelHeader>
          <PanelContent>
            <ul className="flex flex-col gap-2">
              <GroupRow title="Cut off" rule="T1 → T2–T4" count={summary.groups['cut-off']} />
              <GroupRow sub title="No one can walk it" rule="T1 → T4" count={summary.noOneCanWalk} />
              <GroupRow title="Already without access" rule="T2–T4 before" count={summary.groups['already-without']} />
              <GroupRow sub title="Now worse" rule="T2/T3 → T4" count={summary.nowWorse} />
              <GroupRow title="Unaffected" rule="T1 → T1" count={summary.groups.unaffected} />
            </ul>
          </PanelContent>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tile
          loading={loading}
          value={
            shown ? (
              <>
                {roughCount(summary.groups['cut-off'].seniors)}
                <Modelled />
              </>
            ) : (
              '–'
            )
          }
          label={`seniors lose a ${LIMIT_MIN}-min walk (estimate)`}
        />
        <Tile
          loading={loading}
          value={
            shown && priorityAreas !== null ? (
              <>
                {priorityAreas}
                <Modelled />
              </>
            ) : (
              '–'
            )
          }
          label="priority areas for the AAC to check on"
        />
      </div>

      {shown && sensitivity && <SensitivityLine sensitivity={sensitivity} />}
    </>
  );
}
