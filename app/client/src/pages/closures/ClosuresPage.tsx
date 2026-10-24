import { useMemo, useState } from 'react';
import { Button, Skeleton } from '@databricks/appkit-ui/react';
import { assumedNumber, assumptions } from '@shared/assumptions';
import { evaluatePlan, PlanError, type CentreRow, type PlanResult } from '@shared/closure-engine';
import { CentreSearch } from '@/components/shared/CentreSearch';
import { shortName, townLabel, type Centre } from '@/components/shared/centres';
import { MapRow } from '@/components/shared/MapRow';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { QueryError } from '@/components/shared/QueryError';
import { TagBadge } from '@/components/shared/TagBadge';
import { addToPlan, EMPTY_PLAN, withAnchor, type Plan } from './plan';
import { RippleMap } from './RippleMap';
import { TOP_RECEIVERS, WALK_LIMITS } from './settings';
import { takeawaySentence } from './takeaway';
import { headlineTiles } from './tiles';
import { usePlanData } from './usePlanData';
import { VerdictPanel } from './VerdictPanel';
import { STATUS_STYLE } from './verdicts';

const MAX_SELECTED = assumedNumber('plan.max_extra_centres');

type Outcome = { result: PlanResult; error: null } | { result: null; error: string } | null;

// Page 1 · Closure scenarios (for NEA planners): if this centre closes, where do its diners go, and
// what else can safely close at the same time?
export function ClosuresPage() {
  const { data, error } = usePlanData();
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const centreById = useMemo(() => new Map((data?.centres ?? []).map((c) => [c.centre_id, c])), [data]);
  const closed = useMemo(
    () =>
      [plan.anchorId, ...plan.selectedIds].flatMap((id) => {
        const c = id ? centreById.get(id) : undefined;
        return c ? [c] : [];
      }),
    [plan, centreById]
  );
  const anchor = plan.anchorId ? (centreById.get(plan.anchorId) ?? null) : null;

  const outcome: Outcome = useMemo(() => {
    if (!data || !plan.anchorId) return null;
    try {
      return { result: evaluatePlan(data, plan.anchorId, plan.selectedIds, assumptions), error: null };
    } catch (e) {
      if (e instanceof PlanError) return { result: null, error: e.message };
      throw e;
    }
  }, [data, plan]);
  const result = outcome?.result ?? null;
  const statusById = new Map((result?.cards ?? []).map((c) => [c.centreId, c.status]));

  const pickAnchor = (c: Centre | CentreRow) => {
    setPlan((p) => withAnchor(p, c.centre_id));
    setLimitMessage(null);
  };
  const add = (c: Centre) => {
    const next = addToPlan(plan, c, MAX_SELECTED);
    setPlan(next.plan);
    setLimitMessage(next.message);
  };
  const remove = (id: string) => {
    setPlan((p) => ({ ...p, selectedIds: p.selectedIds.filter((s) => s !== id) }));
    setLimitMessage(null);
  };
  const describe = (c: Centre) => {
    const stalls = centreById.get(c.centre_id)?.cooked_food_stalls;
    return stalls === undefined ? townLabel(c.pln_area_n) : `${townLabel(c.pln_area_n)} · ${stalls} stalls`;
  };

  return (
    <div className="flex flex-col gap-panel">
      <Panel>
        <PanelContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Anchor hawker centre</span>
            <CentreSearch
              selectedId={plan.anchorId}
              onSelect={pickAnchor}
              placeholder="Search for a centre to close"
              describe={describe}
            />
            <span className="text-xs text-muted-foreground">Or click a centre on the map.</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              Also close at the same time <span className="font-normal">(up to {MAX_SELECTED})</span>
            </span>
            {plan.selectedIds.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Centres closing at the same time">
                {plan.selectedIds.map((id) => {
                  const status = statusById.get(id);
                  const style = status ? STATUS_STYLE[status] : null;
                  const name = shortName(centreById.get(id)?.name ?? id);
                  return (
                    <li
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-sm"
                    >
                      {style && (
                        <span aria-label={style.word} style={{ color: style.colour }} className="font-bold">
                          {style.icon}
                        </span>
                      )}
                      {name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 rounded-full p-0"
                        aria-label={`Remove ${name}`}
                        onClick={() => remove(id)}
                      >
                        ×
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {plan.anchorId ? (
              <CentreSearch
                selectedId={null}
                onSelect={add}
                placeholder="Add a centre to close at the same time"
                excludedIds={[plan.anchorId, ...plan.selectedIds]}
                describe={describe}
              />
            ) : (
              <span className="text-xs text-muted-foreground">Pick an anchor first.</span>
            )}
            {limitMessage && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {limitMessage}
              </p>
            )}
          </div>
        </PanelContent>
      </Panel>

      {error && <QueryError what="Blocks or centres" error={error} />}

      <MapRow
        map={
          <Panel>
            <PanelHeader>
              <PanelTitle>Where displaced diners go</PanelTitle>
            </PanelHeader>
            <PanelContent className="gap-2">
              {data ? (
                <RippleMap
                  centres={data.centres}
                  closed={closed}
                  result={result}
                  onCentreClick={pickAnchor}
                  className="h-[560px]"
                />
              ) : (
                <Skeleton className="h-[560px] w-full" />
              )}
              <p className="text-xs text-muted-foreground">
                × closed centre · circles sized by extra diners a day · lines to the{' '}
                {result ? `top ${TOP_RECEIVERS} centres` : 'centres'} taking their diners, from the nearest closed
                centre, thicker for a bigger share
                <TagBadge tag="MODELLED" />
              </p>
              <p className="text-xs text-muted-foreground">
                Reads gold.block_options · gold.centres · gold.centre_demand. Diners go to the nearest open centre by
                walking distance.
              </p>
            </PanelContent>
          </Panel>
        }
        side={
          result && anchor ? (
            <VerdictPanel anchorName={shortName(anchor.name)} result={result} onRemove={remove} />
          ) : (
            <Panel>
              <PanelContent>
                <p className="text-sm text-muted-foreground">
                  {data ? 'Pick an anchor centre to see where its diners go.' : 'Loading blocks and centres…'}
                </p>
              </PanelContent>
            </Panel>
          )
        }
      />

      {outcome?.error && <QueryError what="This plan" error={outcome.error} />}
      {result && (
        <>
          <p className="text-base leading-relaxed">
            {takeawaySentence(result.takeaway, WALK_LIMITS)}
            <TagBadge tag="MODELLED" />
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {headlineTiles(result.tiles, WALK_LIMITS).map((t) => (
              <Panel key={t.label}>
                <PanelContent className="h-full gap-1">
                  <span className="font-mono text-2xl leading-tight">{t.value}</span>
                  <span className="text-sm">{t.label}</span>
                  {t.note && <span className="flex-1 text-xs text-muted-foreground">{t.note}</span>}
                  <span>
                    <TagBadge tag={t.tag} />
                  </span>
                  <span className="text-xs text-muted-foreground">{t.source}</span>
                </PanelContent>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
