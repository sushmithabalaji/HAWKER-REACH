import { useMemo, useState } from 'react';
import { Button, Skeleton, ToggleGroup } from '@databricks/appkit-ui/react';
import { Panel, PanelContent } from '@/components/shared/Panel';
import type { PickingInfo } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { Feature, Geometry } from 'geojson';
import { BaseMap } from '@/components/shared/BaseMap';
import type { Bounds } from '@/components/shared/basemapStyles';
import { canPick, type Centre } from '@/components/shared/centres';
import { useGeoData } from '@/components/shared/GeoData';
import type { SubzoneProps } from '@/components/shared/subzones';
import { QueryError } from '@/components/shared/QueryError';
import { InkToggleItem } from '@/components/shared/InkToggleItem';
import { TagBadge } from '@/components/shared/TagBadge';
import { centresLayer } from '@/components/shared/centresLayer';
import { HIGHLIGHT_HEX, INK_HEX, rgb, WHITE_HEX } from '@/components/shared/mapColours';
import { MULTIPLIER_HEX, NOT_AFFECTED_HEX, TIER_HEX } from './colours';
import {
  roughCount,
  TIERS,
  tierReachM,
  type AccessBlock,
  type AreaCutOff,
  type BlockOutcome,
  type Closure,
  type Tier,
} from './scenario';
import { metres, NO_CENTRE, type Names } from './names';
import { LIMIT_MIN, SUPER_AGED_PCT } from './settings';
import { multiplierBand, multiplierBandLabel, MULTIPLIER_BREAKS, type SubzoneSeniors } from './subzoneSeniors';

type View = 'tiers' | 'multiplier';
type Phase = 'before' | 'after';

interface AccessMapProps {
  blocks: AccessBlock[] | null;
  outcomes: BlockOutcome[] | null;
  closure: Closure | null;
  areas: AreaCutOff[];
  priorityIds: ReadonlySet<string> | null; // null until super-aged flags load
  subzoneSeniors: Map<string, SubzoneSeniors>;
  subzonesError: string | null;
  names: Names;
  fitTo: Bounds | null;
  onCentreClick: (centre: Centre) => void;
}

const TIER_MEANING: Record<Tier, string> = {
  T1: 'a senior can walk it',
  T2: 'a typical walker only',
  T3: 'a brisk walker only',
  T4: 'no one can walk it',
};

type SubzoneFeature = Feature<Geometry, SubzoneProps>;

function tierKey(): { tier: Tier; text: string }[] {
  const reach = tierReachM();
  return TIERS.map((tier, i) => ({
    tier,
    text: `${tier} ${i < 3 ? `up to ${metres(reach[i])}` : `over ${metres(reach[2])} or ${NO_CENTRE}`} · ${TIER_MEANING[tier]}`,
  }));
}

function Swatch({ colour, ring }: { colour: string; ring?: string }) {
  return (
    <span
      className="inline-block h-3 w-4 shrink-0 rounded-sm"
      style={{ background: colour, border: ring ? `2px solid ${ring}` : undefined }}
    />
  );
}

// Page 2's map card: blocks by walking tier before or after the closure, or subzones by vulnerability multiplier.
export function AccessMap({
  blocks,
  outcomes,
  closure,
  areas,
  priorityIds,
  subzoneSeniors,
  subzonesError,
  names,
  fitTo,
  onCentreClick,
}: AccessMapProps) {
  const { subzones, centres } = useGeoData();
  const [view, setView] = useState<View>('tiers');
  const [phase, setPhase] = useState<Phase>('after');
  const [popupId, setPopupId] = useState<string | null>(null);

  const outcomeById = useMemo(() => new Map((outcomes ?? []).map((o) => [o.block.block_id, o])), [outcomes]);
  const cutOffBySubzone = useMemo(() => new Map(areas.map((a) => [a.subzone_id, a])), [areas]);
  const closedIds = useMemo(() => new Set(closure ? [closure.centreId, ...closure.alsoClosed] : []), [closure]);

  const layers = useMemo(() => {
    const centreLayer = centresLayer({ centres: centres ?? [], pickedId: closure?.centreId ?? null, closedIds });

    if (view === 'multiplier') {
      // Only priority areas get the dark outline, so the ones needing help first stand out; every area
      // with seniors cut off until the priority rule can run.
      const outlined = (f: SubzoneFeature) =>
        priorityIds ? priorityIds.has(f.properties.subzone_id) : cutOffBySubzone.has(f.properties.subzone_id);
      const shading = new GeoJsonLayer<SubzoneProps>({
        id: 'multiplier',
        data: subzones ?? { type: 'FeatureCollection', features: [] },
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (f: SubzoneFeature) => {
          const band = multiplierBand(subzoneSeniors.get(f.properties.subzone_id)?.multiplier ?? null);
          return band === null ? [0, 0, 0, 0] : rgb(MULTIPLIER_HEX[band], 200);
        },
        getLineColor: (f: SubzoneFeature) => (outlined(f) ? rgb(INK_HEX) : [120, 120, 120, 120]),
        getLineWidth: (f: SubzoneFeature) => (outlined(f) ? 2.5 : 0.5),
        lineWidthUnits: 'pixels',
        updateTriggers: {
          getFillColor: [subzoneSeniors],
          getLineColor: [priorityIds, cutOffBySubzone],
          getLineWidth: [priorityIds, cutOffBySubzone],
        },
      });
      return [shading, centreLayer];
    }

    // Before a closure, every block shows today's tier. After one, only affected blocks are coloured.
    const tierFor = (b: AccessBlock): Tier | null => {
      if (!closure) return b.tier_now;
      const o = outcomeById.get(b.block_id);
      if (!o) return null;
      return phase === 'before' ? b.tier_now : o.after;
    };
    const blockLayer = new ScatterplotLayer<AccessBlock>({
      id: 'blocks',
      data: blocks ?? [],
      pickable: true,
      getPosition: (b) => [b.lon, b.lat],
      radiusUnits: 'pixels',
      getRadius: (b) => (outcomeById.has(b.block_id) ? 3.5 : 2),
      getFillColor: (b) => {
        const tier = tierFor(b);
        return tier ? rgb(TIER_HEX[tier], 230) : rgb(NOT_AFFECTED_HEX, 140);
      },
      updateTriggers: { getRadius: [outcomeById], getFillColor: [outcomeById, phase, closure] },
    });
    return [blockLayer, centreLayer];
  }, [
    view,
    phase,
    blocks,
    centres,
    subzones,
    closure,
    closedIds,
    outcomeById,
    priorityIds,
    cutOffBySubzone,
    subzoneSeniors,
  ]);

  const blockTooltip = (b: AccessBlock) => {
    const nearest = b.options[0];
    const before = `Now: ${b.tier_now} · ${nearest ? `${metres(nearest.walk_m)} to ${names.centre(nearest.centre_id)}` : NO_CENTRE}`;
    const o = outcomeById.get(b.block_id);
    const after = o
      ? `\nAfter: ${o.after} · ${o.afterWalkM !== null ? `${metres(o.afterWalkM)} to ` : ''}${names.centre(o.afterCentreId)}`
      : '';
    return `${b.block_label}\n${before}${after}`;
  };

  // What hovering and clicking each pickable layer does, keyed by layer id.
  const handlers: Record<string, { tooltip: (o: never) => string; click?: (o: never) => void }> = {
    centres: {
      tooltip: (c: Centre) =>
        `${c.name}\n${c.is_interim ? 'Interim: stays open' : 'Click to close it, or click again to reopen'}`,
      click: (c: Centre) => canPick(c) && onCentreClick(c),
    },
    blocks: { tooltip: blockTooltip },
    multiplier: {
      tooltip: (f: SubzoneFeature) => f.properties.name,
      click: (f: SubzoneFeature) => setPopupId(f.properties.subzone_id),
    },
  };
  const getTooltip = ({ object, layer }: PickingInfo) =>
    object && layer ? (handlers[layer.id]?.tooltip(object as never) ?? null) : null;
  const onClick = ({ object, layer }: PickingInfo) => {
    if (object && layer) handlers[layer.id]?.click?.(object as never);
  };

  const popup = popupId ? subzoneSeniors.get(popupId) : undefined;
  const popupCutOff = popupId ? cutOffBySubzone.get(popupId) : undefined;
  const popupName = popupId ? names.subzone(popupId) : undefined;

  return (
    <Panel>
      <PanelContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm font-medium text-muted-foreground">Map shows</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(v) => v && (setView(v as View), setPopupId(null))}
          >
            <InkToggleItem value="tiers">Access tiers</InkToggleItem>
            <InkToggleItem value="multiplier">Vulnerability multiplier</InkToggleItem>
          </ToggleGroup>
          {view === 'tiers' && closure && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={phase}
              onValueChange={(v) => v && setPhase(v as Phase)}
            >
              <InkToggleItem value="before">Before</InkToggleItem>
              <InkToggleItem value="after">After the closure</InkToggleItem>
            </ToggleGroup>
          )}
        </div>

        <div className="relative">
          {blocks ? (
            <BaseMap layers={layers} getTooltip={getTooltip} onClick={onClick} fitTo={fitTo} className="h-[560px]" />
          ) : (
            <Skeleton className="h-[560px] w-full" />
          )}
          {view === 'multiplier' && subzonesError && (
            <div className="absolute left-3 top-3 max-w-[80%]">
              <QueryError what="Share aged 65+ by subzone" error={subzonesError} />
            </div>
          )}
          {view === 'multiplier' && popupId && (
            <div
              role="dialog"
              aria-label={popupName}
              className="absolute left-3 top-3 w-64 rounded-lg border bg-card p-3 text-sm shadow-lg"
            >
              <div className="flex items-start gap-2">
                <strong className="flex-1">{popupName}</strong>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-2 -mt-1 h-7 w-7 p-0"
                  aria-label="Close"
                  onClick={() => setPopupId(null)}
                >
                  ×
                </Button>
              </div>
              {popup?.pct_65p != null && popup.multiplier != null ? (
                <>
                  <div>
                    <strong className="font-mono">{Math.round(popup.pct_65p * 100)}%</strong> of HDB residents are 65+
                    <TagBadge tag="MEASURED" />
                  </div>
                  <div>
                    Vulnerability multiplier <strong className="font-mono">×{popup.multiplier.toFixed(2)}</strong>
                    <TagBadge tag="MODELLED" />
                    <span className="block text-xs text-muted-foreground">its share aged 65+ ÷ the HDB-wide share</span>
                  </div>
                  {popup.is_super_aged && (
                    <div className="mt-1 font-medium text-highlight">⚠ {SUPER_AGED_PCT}%+ aged 65+ (super-aged)</div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Too few HDB residents for a share aged 65+.</div>
              )}
              {closure && (
                <div className="mt-1">
                  <strong className="font-mono">{roughCount(popupCutOff?.seniors ?? 0)}</strong> seniors lose a{' '}
                  {LIMIT_MIN}-min walk
                  <TagBadge tag="MODELLED" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {view === 'tiers' ? (
            <>
              {tierKey().map(({ tier, text }) => (
                <span key={tier} className="flex items-center gap-1.5">
                  <Swatch colour={TIER_HEX[tier]} />
                  {text}
                </span>
              ))}
              {closure && (
                <span className="flex items-center gap-1.5">
                  <Swatch colour={NOT_AFFECTED_HEX} />
                  not affected
                </span>
              )}
              <TagBadge tag="MODELLED" />
            </>
          ) : (
            <>
              {MULTIPLIER_HEX.map((hex, band) => (
                <span key={hex} className="flex items-center gap-1.5">
                  <Swatch colour={hex} />
                  {multiplierBandLabel(band)}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <Swatch colour="transparent" ring={INK_HEX} />
                {priorityIds ? 'priority area' : 'seniors lose their walk'}
              </span>
              <TagBadge tag="MODELLED" />
            </>
          )}
          <span className="flex items-center gap-1.5">
            <Swatch colour={WHITE_HEX} ring={HIGHLIGHT_HEX} />
            closed centre
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {view === 'tiers' && closure && (
            <>
              Coloured blocks are the {(outcomes?.length ?? 0).toLocaleString('en-US')} <TagBadge tag="MODELLED" />{' '}
              whose nearest centre closed, shown by their walk {phase} the closure. Grey blocks keep their nearest
              centre.
            </>
          )}
          {view === 'tiers' &&
            !closure &&
            `Every HDB block by its walk to the nearest hawker centre at ${LIMIT_MIN} min. Click a centre to close it.`}
          {view === 'multiplier' &&
            `Click an area for its share aged 65+. Bands split at ×${MULTIPLIER_BREAKS.join(', ×')}; blank areas have too few residents.`}
        </p>
      </PanelContent>
    </Panel>
  );
}
