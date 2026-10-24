import { Fragment, useMemo } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { TagBadge } from '@/components/shared/TagBadge';
import { roughCount, type BlockOutcome } from './scenario';
import { CUTOFF_M, LIMIT_MIN, MEAL_SUPPORT_WALK_M, MEAL_SUPPORT_WALK_MIN, PACES } from './settings';
import { mealSupportList, supportCsv, type Support } from './support';

interface MealSupportListProps {
  outcomes: BlockOutcome[] | null;
  closedName: string | null;
  subzoneName: (id: string) => string;
  centreName: (id: string | null) => string;
}

const metres = (m: number | null) => (m === null ? '' : ` · ${(Math.round(m / 10) * 10).toLocaleString('en-US')} m`);

function SupportPill({ support }: { support: Support }) {
  return <Badge variant={support === 'Meal delivery' ? 'default' : 'outline'}>{support}</Badge>;
}

function download(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fileSafe = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Who needs what support after the closure: one row per subzone with seniors cut off, its blocks
// underneath, downloadable at block level.
export function MealSupportList({ outcomes, closedName, subzoneName, centreName }: MealSupportListProps) {
  const areas = useMemo(() => (outcomes ? mealSupportList(outcomes) : []), [outcomes]);
  const blocks = areas.reduce((n, a) => n + a.blocks.length, 0);

  const onDownload = () => {
    if (!closedName) return;
    const date = new Date().toISOString().slice(0, 10);
    download(supportCsv(areas, subzoneName, centreName), `meal-support-${fileSafe(closedName)}-${date}.csv`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 space-y-0">
        <CardTitle className="flex-1 text-xl">Senior meal-support list</CardTitle>
        {closedName && areas.length > 0 && (
          <Badge variant="outline">
            {areas.length} {areas.length === 1 ? 'area' : 'areas'} · {blocks} blocks · after {closedName} closes
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!closedName && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Close a centre to list the blocks whose seniors lose their {LIMIT_MIN}-min walk, and the support each needs.
          </p>
        )}
        {closedName && areas.length === 0 && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            No senior loses a {LIMIT_MIN}-min walk when {closedName} closes, so no one needs meal support.
          </p>
        )}
        {areas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground">
                  <th className="border-b-2 border-foreground px-3 py-2">SUBZONE / BLOCK</th>
                  <th className="border-b-2 border-foreground px-3 py-2">
                    EST. SENIORS <TagBadge tag="MODELLED" />
                  </th>
                  <th className="border-b-2 border-foreground px-3 py-2">
                    NEAREST OPEN CENTRE <TagBadge tag="MODELLED" />
                  </th>
                  <th className="border-b-2 border-foreground px-3 py-2">
                    SUGGESTED SUPPORT <TagBadge tag="ASSUMPTION" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <Fragment key={area.subzone_id}>
                    <tr className="border-b bg-muted/40">
                      <td className="px-3 py-2">
                        <strong>{subzoneName(area.subzone_id)}</strong>
                        <span className="block text-xs text-muted-foreground">
                          {area.blocks.map((b) => b.outcome.block.block_label).join(', ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{roughCount(area.seniors)}</td>
                      <td className="px-3 py-2">
                        {centreName(area.furthest.outcome.afterCentreId)}
                        {metres(area.furthest.outcome.afterWalkM)}
                        <span className="block text-xs text-muted-foreground">for its furthest block</span>
                      </td>
                      <td className="px-3 py-2">
                        <SupportPill support={area.support} />
                      </td>
                    </tr>
                    {area.blocks.map(({ outcome: o, support }) => (
                      <tr key={o.block.block_id} className="border-b text-muted-foreground">
                        <td className="py-1.5 pl-8 pr-3">{o.block.block_label}</td>
                        <td className="px-3 py-1.5 font-mono">{roughCount(o.block.est_seniors)}</td>
                        <td className="px-3 py-1.5">
                          {centreName(o.afterCentreId)}
                          {metres(o.afterWalkM)}
                        </td>
                        <td className="px-3 py-1.5">
                          <SupportPill support={support} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Rule (fixed): walking buddy if the nearest open centre after the closure is within{' '}
          {MEAL_SUPPORT_WALK_M.toLocaleString('en-US')} m ({MEAL_SUPPORT_WALK_MIN} min at {PACES[0]} m/s); otherwise, or
          with no centre within {CUTOFF_M / 1000} km, meal delivery. A subzone takes the stricter suggestion of its
          blocks. The nearest AAC is Phase 2, once the MSF data is in.
        </p>
        <div>
          <Button size="lg" onClick={onDownload} disabled={areas.length === 0}>
            Download list (CSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
