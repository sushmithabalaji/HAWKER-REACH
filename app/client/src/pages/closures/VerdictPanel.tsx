import { useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import { assumedNumber } from '@shared/assumptions';
import type { PlanResult, Status } from '@shared/closure-engine';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { Pill } from '@/components/shared/Pill';
import { InfoPopover } from './InfoPopover';
import { WALK_LIMITS } from './settings';
import { cardView, planLineView, TONE_CLASS, type CardView } from './verdicts';

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
      {open && (
        <div className="flex flex-col gap-1 text-sm">
          {card.neaActions && <p>{card.neaActions}</p>}
          {card.overlaps.map((note) => (
            <p key={note} className="text-muted-foreground">
              {note}
            </p>
          ))}
          {card.ownProblems.map((problem) => (
            <p key={problem} className="text-muted-foreground">
              On its own: {problem}
            </p>
          ))}
          <p>{card.readMore.share}</p>
          <div>
            Centres it pushes:
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
          <p>{card.readMore.accessLoss}</p>
          <p className="text-xs text-muted-foreground">
            Only what happens because {card.name} closes together with the rest of the plan, compared with each closing
            separately.
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

// "Can these close with {anchor}?": the whole-plan line, then one card per centre added (#11, Verdict card). Each card
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
          Can these close with {anchorName}?{' '}
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
