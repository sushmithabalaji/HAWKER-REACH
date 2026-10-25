import { roughSeniors, type Candidate } from '@shared/closure-engine';
import { shortName } from '@/components/shared/centres';
import { monthYear, roughDiners } from './format';

export interface CandidateRowView {
  centreId: string;
  name: string;
  /** "Aug 2025", or "Not since 2024" when none is on record since the closure data starts. */
  lastRR: string;
  /** "0", "<5" or "25": seniors are estimates, so to the nearest 5. */
  seniorsCutOff: string;
  /** "1,000", or "<10": diners are modelled, so to the nearest 10. */
  dinersDisplaced: string;
  /** "None", "2 cleaning days", or "—" when no window was given. */
  closuresInWindow: string;
}

const DAY_MS = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A candidate to close in the same window, as its table row shows it (#94): numbers only.
export function candidateRowView(
  c: Candidate,
  { recordsFrom, overlapChecked }: { recordsFrom: number | null; overlapChecked: boolean }
): CandidateRowView {
  const cleaningDays = c.cleaning.reduce((sum, k) => sum + days(k.startDate, k.endDate), 0);
  return {
    centreId: c.centreId,
    name: shortName(c.name),
    lastRR: c.lastRR ? monthYear(c.lastRR) : recordsFrom ? `Not since ${recordsFrom}` : 'Not on record',
    seniorsCutOff: roughSeniors(c.seniorsCutOff),
    dinersDisplaced: roughDiners(c.dinersDisplacedPerDay),
    closuresInWindow: !overlapChecked ? '—' : cleaningDays === 0 ? 'None' : plural(cleaningDays, 'cleaning day'),
  };
}
