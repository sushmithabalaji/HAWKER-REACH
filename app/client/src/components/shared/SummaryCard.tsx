import type { ReactNode } from 'react';

// The summary at the top of each page's side column (#114): one look on both pages. A small label, the
// headline in large type, then a line or two of detail, on chocolate brown edged in the brand orange.
export function SummaryCard({ label, title, children }: { label: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="rounded-xl border-l-4 border-brand bg-topbar px-panel py-4 text-topbar-strong">
      <div className="text-xs font-medium uppercase tracking-wide text-topbar-foreground">{label}</div>
      <div className="text-xl font-semibold leading-snug">{title}</div>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-topbar-foreground">{children}</div>}
    </section>
  );
}
