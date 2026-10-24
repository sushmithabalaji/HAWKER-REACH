import { useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import type { PlanResult, Status } from '@shared/closure-engine';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { Pill } from '@/components/shared/Pill';
import { TagBadge } from '@/components/shared/TagBadge';
import { WALK_LIMITS } from './settings';
import { cardView, planLineView, STATUS_STYLE, TONE_CLASS, type CardView } from './verdicts';

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
      <p className="text-sm">
        {card.reason}
        <TagBadge tag="MODELLED" />
      </p>
      {card.neaActions && (
        <p className="text-sm">
          {card.neaActions}
          <TagBadge tag="MODELLED" />
        </p>
      )}
      {card.overlaps.map((note) => (
        <p key={note} className="text-sm text-muted-foreground">
          {note}
          <TagBadge tag="MEASURED" />
        </p>
      ))}
      {open && (
        <div className="flex flex-col gap-1 text-sm">
          <p>
            {card.readMore.share}
            <TagBadge tag="MODELLED" />
          </p>
          <div>
            Centres it pushes
            <TagBadge tag="MODELLED" />:
            {card.readMore.pushes.length === 0 ? (
              ' none'
            ) : (
              <ul className="ml-4 list-disc">
                {card.readMore.pushes.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
          <p>
            {card.readMore.accessLoss}
            <TagBadge tag="MODELLED" />
          </p>
          <p className="text-xs text-muted-foreground">
            The plan compared with the same plan where {card.name} stays open · gold.block_options · gold.centres ·
            gold.centre_demand · gold.centre_closures
          </p>
        </div>
      )}
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

// "Can these close with {anchor}?": the whole-plan line, then one card per centre added (#11, Verdict card).
export function VerdictPanel({
  anchorName,
  result,
  undercountNote,
  onRemove,
}: {
  anchorName: string;
  result: PlanResult;
  /** The tooltip for a possibly under-counted centre, or null for any other. */
  undercountNote: (centreId: string) => string | null;
  onRemove: (centreId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const line = planLineView(result.plan);
  const cards = result.cards.map((c) => cardView(c, WALK_LIMITS.limitMin));

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Can these close with {anchorName}?</PanelTitle>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {Object.values(STATUS_STYLE).map((s) => (
            <span key={s.word} className={TONE_CLASS[s.tone].text}>
              {s.icon} {s.word}
            </span>
          ))}
        </div>
      </PanelHeader>
      <PanelContent>
        {line ? (
          <div className={`flex flex-col gap-1 rounded-md border p-3 ${TONE_CLASS[line.tone].border}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">Whole plan:</span>
              <StatusMark {...line} />
              <span className="text-muted-foreground">{line.counts}</span>
              <TagBadge tag="MODELLED" />
            </div>
            <p className="text-xs text-muted-foreground">
              Coloured by the added centres. What {anchorName} does on its own is listed, not counted.
            </p>
            {line.anchorProblems.map((p) => (
              <p key={p} className="text-sm text-muted-foreground">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add centres above to check whether they can close together.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Load benchmarks from NEA&rsquo;s single closures: typical {result.benchmark.typical.toFixed(1)} · 3 in 4{' '}
          {result.benchmark.threeInFour.toFixed(1)} extra diners per stall at the worst-hit neighbour
          <TagBadge tag="MODELLED" />
        </p>
        <ul className="flex flex-col gap-2">
          {cards.map((card) => (
            <VerdictCardItem
              key={card.centreId}
              card={card}
              undercountReason={undercountNote(card.centreId)}
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
