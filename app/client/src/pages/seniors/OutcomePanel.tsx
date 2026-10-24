import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@databricks/appkit-ui/react';
import { shortName, type Centre } from '@/components/shared/centres';
import { TagBadge } from '@/components/shared/TagBadge';
import type { NeaClosure } from './closures';
import { roughCount, type Summary } from './scenario';
import { LIMIT_MIN } from './settings';

export interface Sensitivity {
  at10: number | null;
  at20: number | null;
  alone: boolean; // false when other closures overlap, so 10/20 min leave them out
}

interface OutcomePanelProps {
  centre: Centre | null;
  picked: NeaClosure | null;
  summary: Summary | null;
  areas: number;
  sensitivity: Sensitivity | null;
  loading: boolean;
}

// "about 1,235", or "<5" / "0" as they are.
const about = (n: number) => {
  const text = roughCount(n);
  return /^\d/.test(text) && text !== '0' ? `about ${text}` : text;
};

const Modelled = () => <TagBadge tag="MODELLED" />;

function Headline({ centre, picked, summary }: Pick<OutcomePanelProps, 'centre' | 'picked' | 'summary'>) {
  if (!centre || !summary) {
    return <>Pick a real NEA closure above, or click any hawker centre on the map to close it.</>;
  }
  const closed = `${shortName(centre.name)} closed${picked ? ` for ${picked.duration_days} days` : ''}`;
  const cutOff = summary.seniors['cut-off'];
  if (summary.blocks['cut-off'] === 0) {
    return (
      <>
        {closed}: no senior loses a {LIMIT_MIN}-min walk. Another centre is close enough.
      </>
    );
  }
  return (
    <>
      {closed}: {about(cutOff)} seniors <Modelled /> now walk over {LIMIT_MIN} min to a hawker centre.
      <span className="mt-2 block text-sm font-normal opacity-80">
        {summary.blocksNoOneCanWalk > 0 ? (
          <>
            {about(summary.seniorsNoOneCanWalk)} of them <Modelled /> have no centre anyone can walk to in {LIMIT_MIN}{' '}
            min.
          </>
        ) : (
          <>Each of them can still reach a centre in {LIMIT_MIN} min at a typical or brisk pace.</>
        )}
      </span>
    </>
  );
}

function GroupRow({
  title,
  rule,
  blocks,
  seniors,
  sub,
}: {
  title: string;
  rule: string;
  blocks: number;
  seniors: number;
  sub?: boolean;
}) {
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
        {blocks.toLocaleString('en-US')} blocks · {roughCount(seniors)} seniors
        <Modelled />
      </span>
    </li>
  );
}

function Tile({ value, label, loading }: { value: ReactNode; label: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-mono text-2xl text-primary">{value}</div>}
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

// The right-hand column of Page 2: headline, outcome groups, number tiles and the 10/20 min sensitivity line.
export function OutcomePanel({ centre, picked, summary, areas, sensitivity, loading }: OutcomePanelProps) {
  const shown = centre && summary;
  return (
    <>
      <section className="rounded-xl bg-foreground px-5 py-4 text-lg font-medium leading-snug text-background">
        {loading ? 'Loading blocks…' : <Headline centre={centre} picked={picked} summary={summary} />}
      </section>

      {shown && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Blocks whose nearest centre was {shortName(centre.name)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              <GroupRow
                title="Cut off"
                rule="T1 → T2–T4"
                blocks={summary.blocks['cut-off']}
                seniors={summary.seniors['cut-off']}
              />
              <GroupRow
                sub
                title="No one can walk it"
                rule="T1 → T4"
                blocks={summary.blocksNoOneCanWalk}
                seniors={summary.seniorsNoOneCanWalk}
              />
              <GroupRow
                title="Already without access"
                rule="T2–T4 before"
                blocks={summary.blocks['already-without']}
                seniors={summary.seniors['already-without']}
              />
              <GroupRow
                sub
                title="Now worse"
                rule="T2/T3 → T4"
                blocks={summary.blocksNowWorse}
                seniors={summary.seniorsNowWorse}
              />
              <GroupRow
                title="Unaffected"
                rule="T1 → T1"
                blocks={summary.blocks.unaffected}
                seniors={summary.seniors.unaffected}
              />
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tile
          loading={loading}
          value={
            shown ? (
              <>
                {roughCount(summary.seniors['cut-off'])}
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
            shown ? (
              <>
                {areas}
                <Modelled />
              </>
            ) : (
              '–'
            )
          }
          label="areas where the AAC should check in"
        />
      </div>

      {shown && sensitivity && sensitivity.at10 !== null && sensitivity.at20 !== null && (
        <p className="text-sm text-muted-foreground">
          If the limit were 10 min, {about(sensitivity.at10)} seniors <Modelled /> would be cut off; at 20 min,{' '}
          {about(sensitivity.at20)} <Modelled />.{!sensitivity.alone && ' These are for this centre closing alone.'}
        </p>
      )}
    </>
  );
}
