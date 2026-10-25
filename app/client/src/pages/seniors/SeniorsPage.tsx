import { useMemo, useState } from 'react';
import { Button, Skeleton, useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { Panel, PanelContent } from '@/components/shared/Panel';
import type { Bounds } from '@/components/shared/basemapStyles';
import { CentreSearch } from '@/components/shared/CentreSearch';
import { MapRow } from '@/components/shared/MapRow';
import { shortName, townLabel, type Centre } from '@/components/shared/centres';
import { useGeoData } from '@/components/shared/GeoData';
import { NO_PARAMS, toNumber, toText, type RawRow } from '@/components/shared/queryValues';
import { QueryError } from '@/components/shared/QueryError';
import { AccessMap } from './AccessMap';
import { TagBadge } from '@/components/shared/TagBadge';
import {
  closureFor,
  closureLabel,
  dateRange,
  nearbyAlongside,
  pickableIn,
  toNeaClosure,
  type NeaClosure,
} from './closures';
import { AreasToAlert } from './AreasToAlert';
import { MealSupportList } from './MealSupportList';
import { OutcomePanel, type Sensitivity } from './OutcomePanel';
import {
  areasCutOff,
  priorityAreaIds,
  runScenario,
  summarise,
  toAccessBlocks,
  type AccessBlock,
  type Closure,
} from './scenario';
import { makeNames } from './names';
import { SENSITIVITY_LIMITS_MIN } from './settings';
import { toSubzoneSeniors } from './subzoneSeniors';

// What the user closed: a centre clicked or searched, or a real NEA closure picked from the list.
type Selection = { kind: 'centre'; centreId: string } | { kind: 'closure'; closure: NeaClosure } | null;

function boundsOf(blocks: readonly AccessBlock[]): Bounds | null {
  if (blocks.length === 0) return null;
  const lons = blocks.map((b) => b.lon);
  const lats = blocks.map((b) => b.lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

// Page 2 · Seniors & access (for AACs): if this centre closes, which seniors lose a walkable hawker centre?
export function SeniorsPage() {
  const { centres, subzones } = useGeoData();
  const blocksQuery = useAnalyticsQuery('seniors_blocks', NO_PARAMS);
  const closuresQuery = useAnalyticsQuery('seniors_closures', NO_PARAMS);
  const sensitivityQuery = useAnalyticsQuery('seniors_sensitivity', NO_PARAMS);
  const subzonesQuery = useAnalyticsQuery('seniors_subzones', NO_PARAMS);

  const [town, setTown] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  const blocks = useMemo(
    () => (blocksQuery.data ? toAccessBlocks(blocksQuery.data as RawRow[]) : null),
    [blocksQuery.data]
  );
  const closures = useMemo(
    () => (closuresQuery.data as RawRow[] | null)?.map(toNeaClosure) ?? [],
    [closuresQuery.data]
  );
  const subzoneSeniors = useMemo(
    () => new Map(((subzonesQuery.data as RawRow[] | null) ?? []).map(toSubzoneSeniors).map((s) => [s.subzone_id, s])),
    [subzonesQuery.data]
  );
  const centreById = useMemo(() => new Map((centres ?? []).map((c) => [c.centre_id, c])), [centres]);
  // Subzone names from gold.subzone_seniors, falling back to the outline's name for subzones it leaves out.
  const names = useMemo(() => {
    const subzoneNames = new Map((subzones?.features ?? []).map((f) => [f.properties.subzone_id, f.properties.name]));
    for (const s of subzoneSeniors.values()) if (s.subzone_name) subzoneNames.set(s.subzone_id, s.subzone_name);
    return makeNames(centreById, subzoneNames);
  }, [centreById, subzoneSeniors, subzones]);

  const closure: Closure | null = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'centre') return { centreId: selection.centreId, alsoClosed: [] };
    return closureFor(selection.closure, closures);
  }, [selection, closures]);

  const outcomes = useMemo(() => (blocks && closure ? runScenario(blocks, closure) : null), [blocks, closure]);
  const summary = useMemo(() => (outcomes ? summarise(outcomes) : null), [outcomes]);
  const areas = useMemo(() => (outcomes ? areasCutOff(outcomes) : []), [outcomes]);
  // Null until the super-aged flags load (or if they fail), so no super-aged area is hidden as non-priority.
  const subzonesReady = !!subzonesQuery.data && !subzonesQuery.error;
  const priorityIds = useMemo(
    () => (subzonesReady ? priorityAreaIds(areas, (id) => subzoneSeniors.get(id)?.is_super_aged ?? false) : null),
    [areas, subzoneSeniors, subzonesReady]
  );
  // The lists reset to priority areas only whenever the closure changes, overlapping closures included.
  const closureKey = closure ? [closure.centreId, ...closure.alsoClosed].join('|') : '';

  const sensitivity: Sensitivity | null = useMemo(() => {
    if (!closure) return null;
    const rows = ((sensitivityQuery.data as RawRow[] | null) ?? []).filter(
      (r) => toText(r.closed_centre_id) === closure.centreId
    );
    const cutOffAt = SENSITIVITY_LIMITS_MIN.flatMap((limitMin) => {
      const row = rows.find((r) => toNumber(r.limit_min) === limitMin);
      return row ? [{ limitMin, seniors: toNumber(row.seniors_cut_off) }] : [];
    });
    return { cutOffAt, alone: closure.alsoClosed.length === 0, error: sensitivityQuery.error };
  }, [closure, sensitivityQuery.data, sensitivityQuery.error]);

  // Frame the town, widened to any affected block across its border.
  const fitTo = useMemo(() => {
    if (!blocks) return null;
    const inTown = town ? blocks.filter((b) => b.pln_area_n === town) : [];
    return boundsOf([...inTown, ...(outcomes ?? []).map((o) => o.block)]);
  }, [blocks, town, outcomes]);

  const pickable = useMemo(() => pickableIn(closures, town), [closures, town]);
  const closedCentre = closure ? (centreById.get(closure.centreId) ?? null) : null;
  const picked = selection?.kind === 'closure' ? selection.closure : null;
  const notes = useMemo(() => {
    if (!picked || !outcomes) return { works: [], cleaning: [] };
    const neighbours = new Set(outcomes.flatMap((o) => o.block.options.slice(1).map((x) => x.centre_id)));
    return nearbyAlongside(picked, closures, neighbours);
  }, [picked, outcomes, closures]);

  const closeCentre = (c: Centre) =>
    setSelection((s) =>
      s?.kind === 'centre' && s.centreId === c.centre_id ? null : { kind: 'centre', centreId: c.centre_id }
    );
  const changeTown = (t: string | null) => {
    setTown(t);
    setSelection(null);
  };

  const error = blocksQuery.error ?? closuresQuery.error;

  return (
    <>
      <Panel>
        <PanelContent>
          <CentreSearch
            selectedId={selection?.kind === 'centre' ? selection.centreId : null}
            onSelect={closeCentre}
            placeholder="Search for a centre to close"
            town={town}
            onTownChange={changeTown}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">
              Real NEA closures{town ? ` in ${townLabel(town)}` : ''}
              <TagBadge tag="MEASURED" />:
            </span>
            {closuresQuery.loading && <Skeleton className="h-8 w-48" />}
            {!closuresQuery.loading &&
              pickable.map((c) => (
                <Button
                  key={c.closure_id}
                  size="sm"
                  className="rounded-full"
                  variant={picked?.closure_id === c.closure_id ? 'default' : 'outline'}
                  aria-pressed={picked?.closure_id === c.closure_id}
                  onClick={() =>
                    setSelection(picked?.closure_id === c.closure_id ? null : { kind: 'closure', closure: c })
                  }
                >
                  {shortName(c.name)} · {c.type} · {dateRange(c)}
                </Button>
              ))}
            {!closuresQuery.loading && pickable.length === 0 && (
              <span className="text-muted-foreground">none current or upcoming</span>
            )}
            <span className="text-muted-foreground">· or click any centre on the map</span>
          </div>
          {notes.works.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Also closed for works during these dates, so blocks skip them for the next centre still open:{' '}
              {notes.works.map(closureLabel).join('; ')}.
              <TagBadge tag="MEASURED" />
            </p>
          )}
          {notes.cleaning.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Cleaning at nearby centres during these dates, counted as open:{' '}
              {notes.cleaning.map(closureLabel).join('; ')}.
              <TagBadge tag="MEASURED" />
            </p>
          )}
        </PanelContent>
      </Panel>

      {error && <QueryError what="Blocks or closures" error={error} />}

      <MapRow
        map={
          <AccessMap
            blocks={blocks}
            outcomes={outcomes}
            closure={closure}
            areas={areas}
            priorityIds={priorityIds}
            subzoneSeniors={subzoneSeniors}
            subzonesError={subzonesQuery.error}
            names={names}
            fitTo={fitTo}
            onCentreClick={closeCentre}
          />
        }
        side={
          <>
            <OutcomePanel
              centre={closedCentre}
              picked={picked}
              summary={summary}
              priorityAreas={priorityIds?.size ?? null}
              sensitivity={sensitivity}
              loading={!blocks}
            />
            {closedCentre && outcomes && (
              <AreasToAlert
                key={closureKey}
                areas={areas}
                subzoneSeniors={subzoneSeniors}
                priorityIds={priorityIds}
                names={names}
              />
            )}
          </>
        }
      />

      <MealSupportList
        key={closureKey}
        outcomes={outcomes}
        priorityIds={priorityIds}
        closedName={closedCentre ? shortName(closedCentre.name) : null}
        names={names}
      />

      <p className="text-xs text-muted-foreground">
        Sources: HDB property information and building outlines (data.gov.sg) · NEA hawker centres and closure dates ·
        URA Master Plan subzones · SingStat HDB residents by age and subzone. Walks are along the OpenStreetMap walking
        network to the nearest open NEA hawker centre (silver.dist_matrix). Coffee shops and food courts are not
        counted.
      </p>
    </>
  );
}
