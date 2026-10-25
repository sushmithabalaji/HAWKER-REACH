import { Pill, type PillTone } from '@/components/shared/Pill';
import type { Support, SupportNeed } from './support';

// The support labels in the support list, one per area and one per block: one pastel each (#118), so the
// options read as a set and stay the same in the rows and the options list.
const SUPPORT_TONE: Record<Support, PillTone> = {
  Shuttle: 'teal',
  'Meal delivery or vouchers': 'gold',
  'Volunteer check-ins': 'sage',
  'Temporary food point': 'orange',
};

// A support with its reason on hover, e.g. "3 blocks have no centre within 2 km".
export function SupportPill({ support, reason }: { support: Support; reason?: string }) {
  return (
    <span title={reason}>
      <Pill tone={SUPPORT_TONE[support]}>{support}</Pill>
    </span>
  );
}

export function AreaSupports({ supports }: { supports: SupportNeed[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {supports.map(({ support, reason }) => (
        <SupportPill key={support} support={support} reason={reason} />
      ))}
    </span>
  );
}
