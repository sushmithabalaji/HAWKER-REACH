import type { PlanLine, Status, VerdictCard } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { closurePeriod, joinNames } from './format';

// Each status is shown with an icon and a word as well as its colour (#11, story 36). The colour is
// the theme's --status-<tone> token (index.css), from the wireframe.
export const STATUS_STYLE: Record<Status, { icon: string; word: string; tone: Status }> = {
  red: { icon: '✕', word: 'Do not close together', tone: 'red' },
  yellow: { icon: '!', word: 'Close with caution', tone: 'yellow' },
  green: { icon: '✓', word: 'Safe to close together', tone: 'green' },
};

// Theme classes for each status (index.css --status-<tone>), written out so Tailwind keeps them.
export const TONE_CLASS: Record<Status, { text: string; bg: string; border: string }> = {
  red: { text: 'text-status-red', bg: 'bg-status-red', border: 'border-status-red' },
  yellow: { text: 'text-status-yellow', bg: 'bg-status-yellow', border: 'border-status-yellow' },
  green: { text: 'text-status-green', bg: 'bg-status-green', border: 'border-status-green' },
};

export interface CardView {
  centreId: string;
  name: string;
  status: Status;
  icon: string;
  word: string;
  tone: Status;
  reason: string;
  possiblyUndercounted: boolean;
  /** Null when no centre it pushes passes the NEA actions threshold. */
  neaActions: string | null;
  overlaps: string[];
  /** What it does when it closes on its own: listed under the card, never setting its colour. */
  ownProblems: string[];
  readMore: { share: string; pushes: string[]; accessLoss: string };
}

const perStall = (n: number) => `+${n.toFixed(1)}`;

// A verdict card as Page 1 shows it (#11, Verdict card).
export function cardView(card: VerdictCard, limitMin: number): CardView {
  const actions = card.neaActions.map((a, i) =>
    a.extraDinersPerStall === null
      ? shortName(a.name)
      : `${shortName(a.name)} (${perStall(a.extraDinersPerStall)}${i === 0 ? ' extra diners per stall' : ''})`
  );
  const { senior, typical, brisk } = card.accessLoss;
  return {
    centreId: card.centreId,
    name: shortName(card.name),
    status: card.status,
    ...STATUS_STYLE[card.status],
    reason: card.reason,
    possiblyUndercounted: card.possiblyUndercounted,
    ownProblems: card.ownProblems,
    neaActions:
      actions.length > 0
        ? `NEA actions: extra bins, more frequent collection and extra cleaning checks at ${joinNames(actions)}.`
        : null,
    overlaps: card.overlaps.map(
      (o) =>
        `Its ${o.own.type} (${closurePeriod(o.own.startDate, o.own.endDate)}) overlaps ${shortName(o.withName)}’s ` +
        `${o.other.type} (${closurePeriod(o.other.startDate, o.other.endDate)}).`
    ),
    readMore: {
      share: `${Math.round(card.shareOfDisplaced * 100)}% of the plan’s displaced diners have it as their nearest centre`,
      pushes: card.pushes.map(
        (p) =>
          `${shortName(p.name)}: ${Math.round(p.pct)}% busier ` + `(${Math.round(p.ifApart)}% if closed separately)`
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
  tone: Status;
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
