import { roughSeniors, type PlanLine, type Status, type VerdictCard } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { closurePeriod } from './format';

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
  /** Read more (#107): three key numbers up front, then sections that open one at a time. */
  details: CardDetails;
}

export interface CardDetails {
  /** "21%": of the plan's displaced diners, its nearest centre. */
  share: string;
  /** Blocks cut off at senior pace only because it closes too. */
  seniorBlocks: number;
  /** The centre it makes busiest, or null when it pushes none. */
  busiest: { name: string; pct: string } | null;
  /** Every centre it makes busier: together, and if closed separately. */
  pushes: { name: string; together: string; apart: string }[];
  /** Blocks cut off at each pace only because it closes too; all zero when none. */
  accessLoss: { pace: 'Senior' | 'Typical' | 'Brisk'; blocks: number }[];
  /** Centres past the NEA actions flag, each with its extra diners per stall when known. */
  neaActions: string[];
  overlaps: string[];
  /** What it does when it closes on its own, one short point each (#107): never sets its colour. */
  onItsOwn: string[];
}

const perStall = (n: number) => `+${n.toFixed(1)}`;
const busier = (pct: number) => `+${Math.round(pct)}%`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A verdict card as Page 1 shows it (#11, Verdict card).
export function cardView(card: VerdictCard, limitMin: number): CardView {
  const { senior, typical, brisk } = card.accessLoss;
  const top = card.pushes[0];
  return {
    centreId: card.centreId,
    name: shortName(card.name),
    status: card.status,
    ...STATUS_STYLE[card.status],
    reason: card.reason,
    possiblyUndercounted: card.possiblyUndercounted,
    details: {
      share: `${Math.round(card.shareOfDisplaced * 100)}%`,
      seniorBlocks: senior,
      busiest: top ? { name: shortName(top.name), pct: busier(top.pct) } : null,
      pushes: card.pushes.map((p) => ({ name: shortName(p.name), together: busier(p.pct), apart: busier(p.ifApart) })),
      accessLoss: [
        { pace: 'Senior', blocks: senior },
        { pace: 'Typical', blocks: typical },
        { pace: 'Brisk', blocks: brisk },
      ],
      neaActions: card.neaActions.map((a) =>
        a.extraDinersPerStall === null
          ? shortName(a.name)
          : `${shortName(a.name)} · ${perStall(a.extraDinersPerStall)} extra diners per stall`
      ),
      overlaps: card.overlaps.map(
        (o) =>
          `Its ${o.own.type} (${closurePeriod(o.own.startDate, o.own.endDate)}) overlaps ${shortName(o.withName)}’s ` +
          `${o.other.type} (${closurePeriod(o.other.startDate, o.other.endDate)}).`
      ),
      onItsOwn: [
        ...(card.ownImpact.cutOff.blocks > 0
          ? [
              `${plural(card.ownImpact.cutOff.blocks, 'block')} (${roughSeniors(card.ownImpact.cutOff.seniors)} seniors) left with no centre within ${limitMin} min`,
            ]
          : []),
        ...card.ownImpact.busier.map((c) => `${shortName(c.name)} ${busier(c.pct)} busier`),
      ],
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
