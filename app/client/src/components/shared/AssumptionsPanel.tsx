import { resolveLine, type AssumptionLine } from '@shared/assumptions';
import { Panel, PanelContent, PanelHeader, PanelTitle } from './Panel';
import { TagBadge } from './TagBadge';

// Lists the lines a page registered in pages/registry.tsx.
export function AssumptionsPanel({ lines }: { lines: AssumptionLine[] }) {
  if (lines.length === 0) return null;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Assumptions and thresholds on this page</PanelTitle>
      </PanelHeader>
      <PanelContent>
        <ul className="divide-y text-sm">
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
      </PanelContent>
    </Panel>
  );
}
