import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@databricks/appkit-ui/react';
import { assumptions } from '@shared/assumptions';
import { evaluatePlan, PlanError, type CentreRow, type PlanResult } from '@shared/closure-engine';
import { CentreSearch } from '@/components/shared/CentreSearch';
import { townLabel, type Centre } from '@/components/shared/centres';
import { QueryError } from '@/components/shared/QueryError';
import { TagBadge } from '@/components/shared/TagBadge';
import { RippleMap } from './RippleMap';
import { TOP_RECEIVERS, WALK_LIMITS } from './settings';
import { takeawaySentence } from './takeaway';
import { headlineTiles } from './tiles';
import { usePlanData } from './usePlanData';

type Outcome = { result: PlanResult; error: null } | { result: null; error: string } | null;

// Page 1 · Closure scenarios (for NEA planners): if this centre closes, where do its diners go?
export function ClosuresPage() {
  const { data, error } = usePlanData();
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const centreById = useMemo(() => new Map((data?.centres ?? []).map((c) => [c.centre_id, c])), [data]);
  const anchor = anchorId ? (centreById.get(anchorId) ?? null) : null;

  const outcome: Outcome = useMemo(() => {
    if (!data || !anchorId) return null;
    try {
      return { result: evaluatePlan(data, anchorId, [], assumptions), error: null };
    } catch (e) {
      if (e instanceof PlanError) return { result: null, error: e.message };
      throw e;
    }
  }, [data, anchorId]);
  const result = outcome?.result ?? null;

  const pick = (c: Centre | CentreRow) => setAnchorId(c.centre_id);
  const describe = (c: Centre) => {
    const stalls = centreById.get(c.centre_id)?.cooked_food_stalls;
    return stalls === undefined ? townLabel(c.pln_area_n) : `${townLabel(c.pln_area_n)} · ${stalls} stalls`;
  };

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          <span className="text-sm font-medium text-muted-foreground">Anchor hawker centre</span>
          <CentreSearch
            selectedId={anchorId}
            onSelect={pick}
            placeholder="Search for a centre to close"
            describe={describe}
          />
          <span className="text-xs text-muted-foreground">Or click a centre on the map.</span>
        </CardContent>
      </Card>

      {error && <QueryError what="Blocks or centres" error={error} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where displaced diners go</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data ? (
            <RippleMap
              centres={data.centres}
              anchor={anchor}
              result={result}
              onCentreClick={pick}
              className="h-[560px]"
            />
          ) : (
            <Skeleton className="h-[560px] w-full" />
          )}
          <p className="text-xs text-muted-foreground">
            × closed centre · circles sized by extra diners a day · lines to the{' '}
            {result ? `top ${TOP_RECEIVERS} centres` : 'centres'} taking its diners, thicker for a bigger share
            <TagBadge tag="MODELLED" />
          </p>
          <p className="text-xs text-muted-foreground">
            Reads gold.block_options · gold.centres · gold.centre_demand. Diners go to the nearest open centre by
            walking distance.
          </p>
        </CardContent>
      </Card>

      {!anchorId && data && (
        <p className="text-sm text-muted-foreground">Pick an anchor centre to see where its diners go.</p>
      )}
      {outcome?.error && <QueryError what="This plan" error={outcome.error} />}
      {result && (
        <>
          <p className="text-base leading-relaxed">
            {takeawaySentence(result.takeaway, WALK_LIMITS)}
            <TagBadge tag="MODELLED" />
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {headlineTiles(result.tiles, WALK_LIMITS).map((t) => (
              <Card key={t.label}>
                <CardContent className="flex h-full flex-col gap-1 pt-4">
                  <span className="font-mono text-2xl leading-tight">{t.value}</span>
                  <span className="text-sm">{t.label}</span>
                  {t.note && <span className="flex-1 text-xs text-muted-foreground">{t.note}</span>}
                  <span>
                    <TagBadge tag={t.tag} />
                  </span>
                  <span className="text-xs text-muted-foreground">{t.source}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
