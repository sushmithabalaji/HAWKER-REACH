import type { ReactNode } from 'react';

// The wireframe's rounded labels: `ink` for the stronger of two choices (e.g. meal delivery), `outline`
// for the milder one or a plain count, `highlight` for a flag such as super-aged. TagBadge is separate:
// it marks how a number was made.
const TONE = {
  ink: 'border-primary bg-primary text-primary-foreground',
  outline: 'border-input bg-card text-foreground',
  highlight: 'border-highlight-tint bg-highlight-tint font-semibold text-highlight',
} as const;

export type PillTone = keyof typeof TONE;

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 align-middle text-xs ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
