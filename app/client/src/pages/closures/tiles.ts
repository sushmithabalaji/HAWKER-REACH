import type { Tiles } from '@shared/closure-engine';
import type { Tag } from '@shared/tags';
import { shortName } from '@/components/shared/centres';
import { count, pctOverBaseline, roundTo10 } from './format';
import type { WalkLimits } from './settings';
import { countsText } from './verdicts';
import { worstCaseNote } from './notes';

export interface HeadlineTile {
  value: string;
  label: string;
  note: string | null;
  /** Shown on hover, e.g. the worst-case note on a rise above +100%. */
  tooltip: string | null;
  tag: Tag;
  source: string;
}

const STATUS_WORD = { red: 'Red', yellow: 'Yellow', green: 'Green' } as const;

// The four headline numbers below the takeaway (#11, stories 25–29).
export function headlineTiles(tiles: Tiles, { cutoffM }: WalkLimits): HeadlineTile[] {
  const { displaced, biggestLoad, accessLoss, verdict } = tiles;
  const unserved = roundTo10(displaced.unservedDinersPerDay);
  const load = biggestLoad.centre;
  const pct = load && (load.pctOverBaseline === 'new' ? 'new diners' : pctOverBaseline(load.pctOverBaseline));

  return [
    {
      value: displaced.dinersPerDay > 0 ? `≈${count(displaced.dinersPerDay)}` : '0',
      label: 'displaced diners a day',
      note:
        unserved > 0 ? `+${count(unserved)} diners a day newly unserved (no centre within ${cutoffM / 1000} km)` : null,
      tooltip: null,
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
      tooltip: load ? worstCaseNote(load.pctOverBaseline) : null,
      tag: biggestLoad.tag,
      source: biggestLoad.source,
    },
    {
      value: [accessLoss.senior, accessLoss.typical, accessLoss.brisk].map(count).join(' · '),
      label: `blocks losing a centre within ${accessLoss.limitMin} min`,
      note: 'at senior · typical · brisk pace',
      tooltip: null,
      tag: accessLoss.tag,
      source: accessLoss.source,
    },
    {
      value: verdict.status ? STATUS_WORD[verdict.status] : '—',
      label: 'plan verdict',
      note: verdict.status ? countsText(verdict.counts) : 'add centres above to check whether they can close together',
      tooltip: null,
      tag: verdict.tag,
      source: verdict.source,
    },
  ];
}
