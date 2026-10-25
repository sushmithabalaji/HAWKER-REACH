import type { Candidate, Status } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { closurePeriod } from './format';
import { STATUS_STYLE } from './verdicts';

export interface CandidateRowView {
  centreId: string;
  name: string;
  status: Extract<Status, 'green' | 'yellow'>;
  icon: string;
  word: string;
  reason: string;
  /** "1.2 km", a straight line from the anchor. */
  distance: string;
  /** "Opened 1975 (51 years ago)": its age, not the time since its last works. */
  age: string;
  /** Cleaning closures in the window, as a note; empty when there are none. */
  cleaningNotes: string[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A candidate to schedule alongside, as the tab shows it (#54, Candidates).
export function candidateRowView(c: Candidate): CandidateRowView {
  const { icon, word } = STATUS_STYLE[c.status];
  return {
    centreId: c.centreId,
    name: shortName(c.name),
    status: c.status,
    icon,
    word,
    reason: c.reason,
    distance: `${(c.distanceM / 1000).toFixed(1)} km`,
    age:
      c.openingYear === null || c.ageYears === null
        ? 'Opening year unknown'
        : `Opened ${c.openingYear} (${c.ageYears === 0 ? 'this year' : `${plural(c.ageYears, 'year')} ago`})`,
    cleaningNotes: c.cleaning.map((k) => `Cleaning ${closurePeriod(k.startDate, k.endDate)}`),
  };
}
