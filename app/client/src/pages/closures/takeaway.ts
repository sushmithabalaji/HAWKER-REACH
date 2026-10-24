import type { TakeawayParts } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';

export interface WalkLimits {
  limitMin: number;
  cutoffM: number;
}

export const count = (n: number) => n.toLocaleString('en-US');
export const roundTo10 = (n: number) => Math.round(n / 10) * 10;
const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;

// The one-sentence takeaway below the map (#11, story 24), written from the engine's facts.
export function takeawaySentence(parts: TakeawayParts, { limitMin, cutoffM }: WalkLimits): string {
  const names = parts.closedCentreNames.map(shortName);
  const closing = `Closing ${joinNames(names)}`;
  const top = parts.topReceiver;
  const sends = `${closing} sends about ${count(parts.displacedDinersPerDay)} diners a day to`;
  const sentences = top
    ? [
        parts.receiverCount === 1
          ? `${sends} ${shortName(top.name)}.`
          : `${sends} ${plural(parts.receiverCount, 'other centre', 'other centres')}; ` +
            `${shortName(top.name)} takes the most (${Math.round(top.shareOfDisplaced * 100)}%).`,
        cutOff(parts, limitMin, cutoffM),
      ]
    : [
        `${closing} displaces no modelled diners: no HDB block has ${names.length > 1 ? 'them' : 'it'} as its nearest centre.`,
      ];
  const verdict = verdictSummary(parts.verdict.counts);
  return [...sentences, ...(verdict ? [verdict] : [])].join(' ');
}

function joinNames(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
}

// How the added centres came out; null when only the anchor is chosen.
function verdictSummary({ red, yellow, green }: TakeawayParts['verdict']['counts']): string | null {
  const added = red + yellow + green;
  if (added === 0) return null;
  if (added === 1) {
    if (red) return 'The added centre should not close at the same time.';
    return yellow
      ? 'The added centre can close at the same time, with caution.'
      : 'The added centre is safe to close at the same time.';
  }
  if (red === 0 && yellow === 0) return `All ${added} added centres are safe to close at the same time.`;
  const head =
    red > 0
      ? `${red} of the ${added} added centres should not close at the same time`
      : `None of the ${added} added centres has to stay open`;
  return yellow > 0 ? `${head}, and ${yellow} ${yellow === 1 ? 'needs' : 'need'} caution.` : `${head}.`;
}

function cutOff(parts: TakeawayParts, limitMin: number, cutoffM: number): string {
  const losses = [
    parts.unservedResidents > 0 &&
      `about ${count(roundTo10(parts.unservedResidents))} residents are left with no centre within ${cutoffM / 1000} km`,
    parts.seniorBlocksLosingAccess > 0 &&
      `${plural(parts.seniorBlocksLosingAccess, 'block loses', 'blocks lose')} a centre within ${limitMin} min at senior pace`,
  ].filter((l): l is string => Boolean(l));
  if (losses.length === 0) return `Every block keeps a centre within ${limitMin} min at senior pace.`;
  const text = losses.join(', and ');
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}
