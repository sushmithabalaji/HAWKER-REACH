import type { ReactNode } from 'react';

// The wireframe's rounded labels: `ink` for a strong label, `outline` for a plain count, `highlight` for a
// flag such as super-aged, and four pastels (#118) for sets of equal labels, such as the support options.
// TagBadge is separate: it marks how a number was made.
const TONE = {
  ink: 'border-primary bg-primary text-primary-foreground',
  outline: 'border-input bg-card text-foreground',
  highlight: 'border-highlight-tint bg-highlight-tint font-semibold text-highlight',
  teal: 'border-pastel-teal bg-pastel-teal font-medium text-pastel-teal-foreground',
  gold: 'border-pastel-gold bg-pastel-gold font-medium text-pastel-gold-foreground',
  sage: 'border-pastel-sage bg-pastel-sage font-medium text-pastel-sage-foreground',
  orange: 'border-pastel-orange bg-pastel-orange font-medium text-pastel-orange-foreground',
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
