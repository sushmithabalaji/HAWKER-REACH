import type { PlanLine, Status, VerdictCard } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { period } from './format';

// Each status is shown with an icon and a word as well as its colour (#11, story 36). Colours from the wireframe.
export const STATUS_STYLE: Record<Status, { icon: string; word: string; colour: string }> = {
  red: { icon: '✕', word: 'Do not close together', colour: '#B42318' },
  yellow: { icon: '!', word: 'Close with caution', colour: '#D69E00' },
  green: { icon: '✓', word: 'Safe to close together', colour: '#1E7D4F' },
};

export interface CardView {
  centreId: string;
  name: string;
  status: Status;
  icon: string;
  word: string;
  colour: string;
  reason: string;
  possiblyUndercounted: boolean;
  /** Null when no centre it pushes passes the NEA actions threshold. */
  neaActions: string | null;
  overlaps: string[];
  readMore: { share: string; pushes: string[]; accessLoss: string };
}

const perStall = (n: number) => `+${n.toFixed(1)}`;

function joinAnd(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];
}

// A verdict card as Page 1 shows it (#11, Verdict card).
export function cardView(card: VerdictCard, limitMin: number): CardView {
  const actions = card.neaActions.map(
    (a, i) => `${shortName(a.name)} (${perStall(a.extraDinersPerStall)}${i === 0 ? ' extra diners per stall' : ''})`
  );
  const { senior, typical, brisk } = card.accessLoss;
  return {
    centreId: card.centreId,
    name: shortName(card.name),
    status: card.status,
    ...STATUS_STYLE[card.status],
    reason: card.reason,
    possiblyUndercounted: card.possiblyUndercounted,
    neaActions:
      actions.length > 0
        ? `NEA actions: extra bins, more frequent collection and extra cleaning checks at ${joinAnd(actions)}.`
        : null,
    overlaps: card.overlaps.map(
      (o) =>
        `Its ${o.own.type} (${period(o.own.startDate, o.own.endDate)}) overlaps ${shortName(o.withName)}’s ` +
        `${o.other.type} (${period(o.other.startDate, o.other.endDate)}).`
    ),
    readMore: {
      share: `${Math.round(card.shareOfDisplaced * 100)}% of the plan’s displaced diners have it as their nearest centre`,
      pushes: card.pushes.map(
        (p) =>
          `${shortName(p.name)}: ${perStall(p.extraDinersPerStall)} extra diners per stall ` +
          `(${perStall(p.withoutThisCentre)} if it stays open)`
      ),
      accessLoss:
        senior + typical + brisk > 0
          ? `${senior} · ${typical} · ${brisk} blocks lose a centre within ${limitMin} min at senior · typical · brisk pace because it closes too`
          : `No block loses a centre within ${limitMin} min because it closes too`,
    },
  };
}

export const countsText = ({ red, yellow, green }: PlanLine['counts']) =>
  `${red} red · ${yellow} yellow · ${green} green`;

export interface PlanLineView {
  status: Status;
  icon: string;
  word: string;
  colour: string;
  counts: string;
  anchorProblems: string[];
}

// The whole-plan line above the cards (#11, story 23); null while only the anchor is chosen.
export function planLineView(line: PlanLine): PlanLineView | null {
  if (!line.status) return null;
  return {
    status: line.status,
    ...STATUS_STYLE[line.status],
    counts: countsText(line.counts),
    anchorProblems: line.anchorProblems,
  };
}
