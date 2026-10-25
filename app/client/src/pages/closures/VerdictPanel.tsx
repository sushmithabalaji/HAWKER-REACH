import { useState, type ReactNode } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { assumedNumber } from '@shared/assumptions';
import type { PlanResult, Status } from '@shared/closure-engine';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { Pill } from '@/components/shared/Pill';
import { InfoPopover } from './InfoPopover';
import { WALK_LIMITS } from './settings';
import { cardView, planLineView, TONE_CLASS, type CardDetails, type CardView } from './verdicts';

const pct = (key: string) => `${Math.round(assumedNumber(key) * 100)}%`;

function StatusMark({ icon, word, tone }: { icon: string; word: string; tone: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${TONE_CLASS[tone].text}`}>
      <span
        aria-hidden
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-white ${TONE_CLASS[tone].bg}`}
      >
        {icon}
      </span>
      {word}
    </span>
  );
}

// One Read more section: a heading with its count, closed until the planner opens it (#107).
function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <details className="group rounded-md border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block text-xs transition-transform group-open:rotate-90">
          ▸
        </span>
        {title}
        {count !== undefined && <span className="font-normal text-muted-foreground">({count})</span>}
      </summary>
      <div className="px-2.5 pb-2 text-sm">{children}</div>
    </details>
  );
}

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-lg font-semibold leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{caption}</span>
    </div>
  );
}

// Read more (#107): three key numbers, then a section for each kind of detail it has.
function CardDetailsView({ name, details: d }: { name: string; details: CardDetails }) {
  const anyAccessLoss = d.accessLoss.some((a) => a.blocks > 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 rounded-md bg-card p-2">
        <Stat value={d.share} caption="of the plan's displaced diners" />
        <Stat value={String(d.seniorBlocks)} caption="blocks cut off at senior pace" />
        <Stat value={d.busiest?.pct ?? '—'} caption={d.busiest ? `busiest: ${d.busiest.name}` : 'no centre busier'} />
      </div>
      {d.pushes.length > 0 && (
        <Section title="Centres it makes busier" count={d.pushes.length}>
          <table className="w-full text-left">
            <thead className="font-mono text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">CENTRE</th>
                <th className="py-1 font-normal">TOGETHER</th>
                <th className="py-1 font-normal">IF CLOSED SEPARATELY</th>
              </tr>
            </thead>
            <tbody>
              {d.pushes.map((p) => (
                <tr key={p.name} className="border-t">
                  <td className="py-1">{p.name}</td>
                  <td className="py-1 font-mono">{p.together}</td>
                  <td className="py-1 font-mono text-muted-foreground">{p.apart}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {anyAccessLoss && (
        <Section title="Walking access">
          <div className="grid grid-cols-3 gap-2">
            {d.accessLoss.map((a) => (
              <Stat key={a.pace} value={String(a.blocks)} caption={`blocks cut off, ${a.pace.toLowerCase()} pace`} />
            ))}
          </div>
        </Section>
      )}
      {d.neaActions.length > 0 && (
        <Section title="NEA actions" count={d.neaActions.length}>
          <p className="text-muted-foreground">Extra bins, more frequent collection and extra cleaning checks at:</p>
          <ul className="ml-4 list-disc">
            {d.neaActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>
      )}
      {d.overlaps.length > 0 && (
        <Section title="Schedule overlaps" count={d.overlaps.length}>
          {d.overlaps.map((o) => (
            <p key={o}>{o}</p>
          ))}
        </Section>
      )}
      {d.onItsOwn.length > 0 && (
        <Section title={`${name} on its own`} count={d.onItsOwn.length}>
          <ul className="ml-4 list-disc">
            {d.onItsOwn.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>
      )}
      <p className="text-xs text-muted-foreground">
        How this is counted
        <InfoPopover label="How Read more is worked out">
          Each number compares the plan with {name} and the rest closing together against each closing separately. What{' '}
          {name} does alone is listed under &ldquo;on its own&rdquo; and never sets its colour.
        </InfoPopover>
      </p>
    </div>
  );
}

function VerdictCardItem({
  card,
  undercountReason,
  open,
  onToggle,
  onRemove,
}: {
  card: CardView;
  undercountReason: string | null;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={`flex flex-col gap-2 rounded-md border-l-4 bg-muted/40 p-3 ${TONE_CLASS[card.tone].border}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusMark {...card} />
        <span className="font-medium">{card.name}</span>
        {card.possiblyUndercounted && (
          <span title={undercountReason ?? undefined}>
            <Pill tone="outline">Possibly under-counted</Pill>
          </span>
        )}
      </div>
      <p className="text-sm">{card.reason}</p>
      {open && <CardDetailsView name={card.name} details={card.details} />}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="h-7 px-2" aria-expanded={open} onClick={onToggle}>
          {open ? 'Minimise ▲' : 'Read more ▼'}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </li>
  );
}

// "Concurrent closure check: {anchor}": the whole-plan line, then one card per centre added (#11, Verdict card). Each card
// is its status, name and one-line reason; everything else is behind Read more (#101).
export function VerdictPanel({
  anchorName,
  result,
  undercountNotes,
  onRemove,
}: {
  anchorName: string;
  result: PlanResult;
  /** The badge tooltip for each possibly under-counted centre, by centre_id. */
  undercountNotes: Map<string, string>;
  onRemove: (centreId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const line = planLineView(result.plan);
  const cards = result.cards.map((c) => cardView(c, WALK_LIMITS.limitMin));

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          Concurrent closure check: {anchorName}{' '}
          <InfoPopover label="How each colour is decided">
            Only what happens because two centres close together counts. Red: the added centre takes{' '}
            {pct('verdict.share.red')} or more of the other closures&rsquo; diners, cuts off a block that neither
            closure cuts off alone, or makes a third centre more than {pct('verdict.load.red_pct')} busier only when
            both close. Yellow: {pct('verdict.share.yellow')} or more of their diners, or a third centre more than{' '}
            {pct('verdict.load.yellow_pct')} busier.
          </InfoPopover>
        </PanelTitle>
      </PanelHeader>
      <PanelContent>
        {line ? (
          <div className={`flex flex-col gap-1 rounded-md border p-3 ${TONE_CLASS[line.tone].border}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">
                Whole plan:
                <InfoPopover label="How the whole plan is coloured">
                  Coloured by the added centres. What {anchorName} does on its own is listed, not counted.
                </InfoPopover>
              </span>
              <StatusMark {...line} />
              <span className="text-muted-foreground">{line.counts}</span>
              {line.anchorProblems.length > 0 && (
                <span className="text-muted-foreground">
                  · {anchorName} on its own
                  <InfoPopover label={`What closing ${anchorName} on its own does`}>
                    {line.anchorProblems.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </InfoPopover>
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add centres above to check whether they can close together.</p>
        )}
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <VerdictCardItem
              key={card.centreId}
              card={card}
              undercountReason={undercountNotes.get(card.centreId) ?? null}
              open={openId === card.centreId}
              onToggle={() => setOpenId(openId === card.centreId ? null : card.centreId)}
              onRemove={() => onRemove(card.centreId)}
            />
          ))}
        </ul>
      </PanelContent>
    </Panel>
  );
}
