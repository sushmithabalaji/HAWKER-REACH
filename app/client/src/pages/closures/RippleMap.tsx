import { useMemo } from 'react';
import type { PickingInfo } from '@deck.gl/core';
import { LineLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { CentreRow, PlanResult, Receiver } from '@shared/closure-engine';
import { BaseMap } from '@/components/shared/BaseMap';
import type { Bounds } from '@/components/shared/basemapStyles';
import { canPick, shortName } from '@/components/shared/centres';
import { HIGHLIGHT_HEX, INK_HEX, INTERIM_HEX, rgb, WHITE_HEX } from '@/components/shared/mapColours';
import { TOP_RECEIVERS } from './settings';
import { count, pctOverBaseline } from './format';

const OTHER_HEX = '#9AA5B1';
const RECEIVER_HEX = '#2F86B0';

interface RippleMapProps {
  centres: CentreRow[];
  anchor: CentreRow | null;
  result: PlanResult | null;
  onCentreClick: (centre: CentreRow) => void;
  className?: string;
}

interface PlacedReceiver extends Receiver {
  position: [number, number];
}

const position = (c: CentreRow): [number, number] => [c.lon, c.lat];

function boundsOf(points: [number, number][]): Bounds | null {
  if (points.length === 0) return null;
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

// Page 1's map (#11, map layers): where the closed centre's diners go. Static for now; the ripple
// animation, displaced blocks and access outlines come in #16.
export function RippleMap({ centres, anchor, result, onCentreClick, className }: RippleMapProps) {
  const centreById = useMemo(() => new Map(centres.map((c) => [c.centre_id, c])), [centres]);

  const receivers = useMemo<PlacedReceiver[]>(
    () =>
      (result?.receivers ?? []).flatMap((r) => {
        const c = centreById.get(r.centreId);
        return c ? [{ ...r, position: position(c) }] : [];
      }),
    [result, centreById]
  );
  const top = useMemo(() => receivers.slice(0, TOP_RECEIVERS), [receivers]);

  // Frame the anchor and the centres taking most of its diners.
  const fitTo = useMemo(
    () => (anchor ? boundsOf([position(anchor), ...top.map((r) => r.position)]) : null),
    [anchor, top]
  );

  const layers = useMemo(() => {
    const receiverIds = new Set(receivers.map((r) => r.centreId));
    const maxExtra = Math.max(1, ...receivers.map((r) => r.extraDinersPerDay));
    const maxShare = Math.max(0.01, ...top.map((r) => r.shareOfDisplaced));

    const others = new ScatterplotLayer<CentreRow>({
      id: 'centres',
      data: centres.filter((c) => c.centre_id !== anchor?.centre_id && !receiverIds.has(c.centre_id)),
      pickable: true,
      getPosition: position,
      radiusUnits: 'pixels',
      getRadius: 4,
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      getLineColor: rgb(WHITE_HEX),
      getFillColor: (c) => rgb(c.is_interim ? INTERIM_HEX : OTHER_HEX),
    });
    const lines = new LineLayer<PlacedReceiver>({
      id: 'lines',
      data: anchor ? top : [],
      getSourcePosition: () => position(anchor!),
      getTargetPosition: (r) => r.position,
      widthUnits: 'pixels',
      getWidth: (r) => 2 + 10 * (r.shareOfDisplaced / maxShare),
      getColor: rgb(HIGHLIGHT_HEX, 170),
    });
    const sized = new ScatterplotLayer<PlacedReceiver>({
      id: 'receivers',
      data: receivers,
      pickable: true,
      getPosition: (r) => r.position,
      radiusUnits: 'pixels',
      // Area grows with extra diners
      getRadius: (r) => 5 + 17 * Math.sqrt(r.extraDinersPerDay / maxExtra),
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 1.5,
      getLineColor: rgb(WHITE_HEX),
      getFillColor: rgb(RECEIVER_HEX, 200),
    });
    const closed = new TextLayer<CentreRow>({
      id: 'closed',
      data: anchor ? [anchor] : [],
      pickable: true,
      getPosition: position,
      getText: () => '×',
      characterSet: ['×'],
      getSize: 34,
      fontWeight: 'bold',
      getColor: rgb(HIGHLIGHT_HEX),
    });
    const labels = new TextLayer<PlacedReceiver>({
      id: 'labels',
      data: top,
      getPosition: (r) => r.position,
      getText: (r) =>
        `${shortName(r.name)} · ${Math.round(r.shareOfDisplaced * 100)}% · +${count(Math.round(r.extraDinersPerDay))}/day`,
      characterSet: 'auto',
      getSize: 12,
      getColor: rgb(INK_HEX),
      getPixelOffset: [0, -26],
      background: true,
      getBackgroundColor: [255, 255, 255, 220],
      backgroundPadding: [4, 2],
      fontFamily: 'system-ui, sans-serif',
    });
    return [others, lines, sized, closed, labels];
  }, [centres, anchor, receivers, top]);

  // What hovering and clicking each pickable layer does, keyed by layer id.
  const pickCentre = (c: CentreRow) => canPick(c) && onCentreClick(c);
  const handlers: Record<string, { tooltip: (o: never) => string; click?: (o: never) => void }> = {
    centres: {
      tooltip: (c: CentreRow) =>
        `${c.name}\n${c.is_interim ? "Interim: stays open, so it can't be the anchor" : 'Click to make it the anchor'}`,
      click: pickCentre,
    },
    receivers: {
      tooltip: (r: PlacedReceiver) =>
        `${r.name}\n+${count(Math.round(r.extraDinersPerDay))} diners a day (${pctOverBaseline(r.pctOverBaseline)})` +
        `\n${r.extraDinersPerStall === null ? 'No stalls recorded' : `+${r.extraDinersPerStall.toFixed(1)} per stall`}` +
        ` · ${Math.round(r.shareOfDisplaced * 100)}% of displaced diners`,
      click: (r: PlacedReceiver) => {
        const c = centreById.get(r.centreId);
        if (c) pickCentre(c);
      },
    },
    closed: { tooltip: (c: CentreRow) => `${c.name}\nClosed (anchor)` },
  };
  const getTooltip = ({ object, layer }: PickingInfo) =>
    object && layer ? (handlers[layer.id]?.tooltip(object as never) ?? null) : null;
  const onClick = ({ object, layer }: PickingInfo) => {
    if (object && layer) handlers[layer.id]?.click?.(object as never);
  };

  return <BaseMap layers={layers} getTooltip={getTooltip} onClick={onClick} fitTo={fitTo} className={className} />;
}
