import { resolveLine, type AssumptionLine } from '@shared/assumptions';
import { Panel } from './Panel';
import { TagBadge } from './TagBadge';

// Lists the lines a page registered in pages/registry.tsx: a small card at the bottom of the page, closed by
// default, so the page leads with its findings and the method is one click away.
export function AssumptionsPanel({ lines }: { lines: AssumptionLine[] }) {
  if (lines.length === 0) return null;

  return (
    <Panel className="py-0">
      <details className="group px-panel">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
            ▸
          </span>
          Assumptions and sources ({lines.length})
        </summary>
        <ul className="divide-y border-t pb-2 text-sm">
          {lines.map((raw) => {
            const line = resolveLine(raw);
            return (
              <li key={`${line.text}|${line.source}`} className="py-2">
                {line.text}
                {line.tag && <TagBadge tag={line.tag} />}
                <span className="block text-xs text-muted-foreground">{line.source}</span>
              </li>
            );
          })}
        </ul>
      </details>
    </Panel>
  );
}
