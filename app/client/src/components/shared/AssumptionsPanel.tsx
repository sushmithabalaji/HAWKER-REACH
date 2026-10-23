import { Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { resolveLine, type AssumptionLine } from '@shared/assumptions';
import { TagBadge } from './TagBadge';

// Lists the lines a page registered in pages/registry.tsx.
export function AssumptionsPanel({ lines }: { lines: AssumptionLine[] }) {
  if (lines.length === 0) return null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-base">Assumptions</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {lines.map((l) => resolveLine(l)).map((line) => (
            <li key={line.text}>
              {line.text}
              <TagBadge tag={line.tag} />
              <span className="block text-xs text-muted-foreground">{line.source}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
