import { Pill, type PillTone } from '@/components/shared/Pill';
import type { Support, SupportNeed } from './support';

// The support labels both the support list and "What to do" show.
const SUPPORT_TONE: Record<Support, PillTone> = {
  Shuttle: 'outline',
  'Meal delivery or vouchers': 'ink',
  'Volunteer check-ins': 'highlight',
  'Temporary food point': 'ink',
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
