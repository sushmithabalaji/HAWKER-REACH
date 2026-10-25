import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Skeleton } from '@databricks/appkit-ui/react';
import { assumedNumber, assumptions } from '@shared/assumptions';
import { evaluatePlan, PlanError, type CentreRow, type PlanResult } from '@shared/closure-engine';
import { CentreSearch } from '@/components/shared/CentreSearch';
import { shortName, townLabel, type Centre } from '@/components/shared/centres';
import { MapRow } from '@/components/shared/MapRow';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/shared/Panel';
import { QueryError } from '@/components/shared/QueryError';
import { localToday, type WindowEdit } from './closureWindow';
import { addToPlan, EMPTY_PLAN, removeFromPlan, withAnchor, type Plan } from './plan';
import { undercountNotes as notesFor } from './notes';
import { blockPoints } from './blocks';
import { DemandWaste } from './DemandWaste';
import { InfoPopover } from './InfoPopover';
import { ScheduleAlongside } from './ScheduleAlongside';
import { RippleMap } from './RippleMap';
import { TOP_RECEIVERS, WALK_LIMITS } from './settings';
import { takeawaySentence } from './takeaway';
import { headlineTiles } from './tiles';
import { usePlanData } from './usePlanData';
import { VerdictPanel } from './VerdictPanel';
import { STATUS_STYLE, TONE_CLASS } from './verdicts';

const MAX_SELECTED = assumedNumber('plan.max_extra_centres');
const UNDERCOUNT_FACTOR = assumedNumber('undercount_factor');

type Outcome = { result: PlanResult; error: null } | { result: null; error: string } | null;

// Page 1 · Closure scenarios (for NEA planners): if this centre closes, where do its diners go, and
// what else can safely close at the same time? Retry remounts the page, which reruns its queries.
// The plan lives here, so a retry keeps the centres the planner picked.
export function ClosuresPage() {
  const [attempt, setAttempt] = useState(0);
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN);
  const [windowEdit, setWindowEdit] = useState<WindowEdit | null>(null);
  return (
    <ClosuresContent
      key={attempt}
      plan={plan}
      setPlan={setPlan}
      windowEdit={windowEdit}
      setWindowEdit={setWindowEdit}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function ClosuresContent({
  plan,
  setPlan,
  windowEdit,
  setWindowEdit,
  onRetry,
}: {
  plan: Plan;
  setPlan: Dispatch<SetStateAction<Plan>>;
  windowEdit: WindowEdit | null;
  setWindowEdit: Dispatch<SetStateAction<WindowEdit | null>>;
  onRetry: () => void;
}) {
  const { data, error } = usePlanData();
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

  const blocks = useMemo(() => blockPoints(data?.blockOptions ?? []), [data]);
  const undercountNotes = useMemo(() => notesFor(data?.centreDemand ?? [], UNDERCOUNT_FACTOR), [data]);

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

  const panelPlaceholder = (what: string) =>
    outcome?.error ??
    (error
      ? 'Blocks and centres did not load, so there is nothing to show yet.'
      : data
        ? `Pick an anchor centre to see ${what}.`
        : 'Loading blocks and centres…');

  const pickAnchor = (c: Centre | CentreRow) => {
    setPlan((p) => withAnchor(p, c.centre_id));
    setLimitMessage(null);
  };
  const add = (c: Pick<CentreRow, 'centre_id' | 'is_interim'>) => {
    const next = addToPlan(plan, c, MAX_SELECTED);
    setPlan(next.plan);
    setLimitMessage(next.message);
  };
  // "Add to plan" on a candidate goes the same way as the search box, so the limit and interim rules still apply.
  const addById = (id: string) => {
    const c = centreById.get(id);
    if (c) add(c);
  };
  const remove = (id: string) => {
    setPlan((p) => removeFromPlan(p, id));
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
                        <span aria-label={style.word} className={`font-bold ${TONE_CLASS[style.tone].text}`}>
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

      {error && (
        <div className="flex flex-wrap items-center gap-2">
          <QueryError what="Blocks or centres" error={error} />
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}

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
                  blocks={blocks}
                  undercountNotes={undercountNotes}
                  onCentreClick={pickAnchor}
                  className="h-[560px]"
                />
              ) : (
                <Skeleton className="h-[600px] w-full" />
              )}
              <p className="text-xs text-muted-foreground">
                × closed · circle size: extra diners a day · lines: top {TOP_RECEIVERS} centres taking its diners ·
                dashed ring: possibly under-counted
              </p>
            </PanelContent>
          </Panel>
        }
        side={
          result && anchor ? (
            <VerdictPanel
              anchorName={shortName(anchor.name)}
              result={result}
              undercountNotes={undercountNotes}
              onRemove={remove}
            />
          ) : (
            <Panel>
              <PanelContent>
                <p className="text-sm text-muted-foreground">
                  {outcome?.error ??
                    (data ? 'Pick an anchor centre to see where its diners go.' : 'Loading blocks and centres…')}
                </p>
              </PanelContent>
            </Panel>
          )
        }
      />

      {outcome?.error && <QueryError what="This plan" error={outcome.error} />}
      {result && anchor && undercountNotes.has(anchor.centre_id) && (
        <p role="note" className="rounded-md border border-highlight bg-highlight-tint p-3 text-sm text-highlight">
          ⚠ {shortName(anchor.name)} is possibly under-counted: {undercountNotes.get(anchor.centre_id)} Its displaced
          diners are a floor, not an estimate.
        </p>
      )}
      {result && (
        <>
          <Panel className="border-foreground/20 bg-muted/40">
            <PanelContent>
              <p className="text-lg font-medium leading-relaxed">{takeawaySentence(result.takeaway, WALK_LIMITS)}</p>
            </PanelContent>
          </Panel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {headlineTiles(result.tiles, WALK_LIMITS).map((t) => (
              <Panel key={t.label}>
                <PanelContent className="h-full gap-1">
                  <span className="font-mono text-3xl font-semibold leading-tight">{t.value}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                  {t.note && (
                    <span className="text-xs text-muted-foreground">
                      {t.note}
                      {t.tooltip && <InfoPopover label="Worst case">{t.tooltip}</InfoPopover>}
                    </span>
                  )}
                </PanelContent>
              </Panel>
            ))}
          </div>
        </>
      )}
      <Panel>
        <PanelHeader>
          <PanelTitle>Demand dispersion and waste</PanelTitle>
        </PanelHeader>
        <PanelContent>
          <DemandWaste result={result} placeholder={panelPlaceholder('the extra demand and waste')} />
        </PanelContent>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>Centres to close in the same window</PanelTitle>
        </PanelHeader>
        <PanelContent>
          {data && plan.anchorId && result ? (
            <ScheduleAlongside
              data={data}
              anchorId={plan.anchorId}
              selectedIds={plan.selectedIds}
              edit={windowEdit}
              onEdit={setWindowEdit}
              onAdd={addById}
              today={localToday()}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {panelPlaceholder('centres that could close in the same window')}
            </p>
          )}
        </PanelContent>
      </Panel>
    </div>
  );
}
