import type { Tiles } from '@shared/closure-engine';
import type { Tag } from '@shared/tags';
import { shortName } from '@/components/shared/centres';
import { count, roundTo10, type WalkLimits } from './takeaway';

export interface HeadlineTile {
  value: string;
  label: string;
  note: string | null;
  tag: Tag;
  source: string;
}

const STATUS_WORD = { red: 'Red', yellow: 'Yellow', green: 'Green' } as const;

// The four headline numbers below the takeaway (#11, stories 25–29).
export function headlineTiles(tiles: Tiles, { cutoffM }: WalkLimits): HeadlineTile[] {
  const { displaced, biggestLoad, accessLoss, verdict } = tiles;
  const unserved = roundTo10(displaced.unservedDinersPerDay);
  const load = biggestLoad.centre;
  const pct = load && (load.pctOverBaseline === 'new' ? 'new diners' : `+${Math.round(load.pctOverBaseline)}%`);

  return [
    {
      value: displaced.dinersPerDay > 0 ? `≈${count(displaced.dinersPerDay)}` : '0',
      label: 'displaced diners a day',
      note: unserved > 0 ? `+${count(unserved)} a day newly unserved (no centre within ${cutoffM / 1000} km)` : null,
      tag: displaced.tag,
      source: displaced.source,
    },
    {
      value: load?.extraDinersPerStall != null ? `+${load.extraDinersPerStall.toFixed(1)}` : '—',
      label: 'biggest load increase, extra diners per stall',
      note: load
        ? [shortName(load.name), load.extraDinersPerStall === null && 'no stalls recorded', pct]
            .filter(Boolean)
            .join(' · ')
        : 'no centre takes extra diners',
      tag: biggestLoad.tag,
      source: biggestLoad.source,
    },
    {
      value: [accessLoss.senior, accessLoss.typical, accessLoss.brisk].map(count).join(' · '),
      label: `blocks losing a centre within ${accessLoss.limitMin} min`,
      note: 'at senior · typical · brisk pace',
      tag: accessLoss.tag,
      source: accessLoss.source,
    },
    {
      value: verdict.status ? STATUS_WORD[verdict.status] : '—',
      label: 'plan verdict',
      note: verdict.status
        ? `${verdict.counts.red} red · ${verdict.counts.yellow} yellow · ${verdict.counts.green} green`
        : 'add centres to close at the same time',
      tag: verdict.tag,
      source: verdict.source,
    },
  ];
}
