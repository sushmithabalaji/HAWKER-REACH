import { useEffect, useMemo, useState } from 'react';
import { Button } from '@databricks/appkit-ui/react';
import type { PickingInfo } from '@deck.gl/core';
import { IconLayer, LineLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { CentreRow, PlanResult, Receiver } from '@shared/closure-engine';
import { BaseMap } from '@/components/shared/BaseMap';
import type { Bounds } from '@/components/shared/basemapStyles';
import { canPick, shortName } from '@/components/shared/centres';
import { HIGHLIGHT_HEX, INK_HEX, INTERIM_HEX, rgb, WHITE_HEX } from '@/components/shared/mapColours';
import { blockBand, type BlockPoint } from './blocks';
import { TOP_RECEIVERS, WALK_LIMITS } from './settings';
import { count, pctOverBaseline, roundTo10 } from './format';
import { worstCaseNote } from './notes';
import { rippleFrame, SETTLED, START, type RippleFrame } from './ripple';

const OTHER_HEX = '#9AA5B1';
const RECEIVER_HEX = '#2F86B0';
// The "possibly under-counted" badge on the map: a dashed ring (deck.gl has no dashed strokes, so it is an icon).
const DASHED_RING = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="29" fill="none" stroke="${INK_HEX}" stroke-width="3" stroke-dasharray="7 5"/></svg>`
)}`;

interface RippleMapProps {
  centres: CentreRow[];
  /** The anchor first, then the centres closing at the same time. */
  closed: CentreRow[];
  result: PlanResult | null;
  blocks: Map<string, BlockPoint>;
  /** The badge tooltip for each possibly under-counted centre, by centre_id. */
  undercountNotes: Map<string, string>;
  onCentreClick: (centre: CentreRow) => void;
  className?: string;
}

interface PlacedReceiver extends Receiver {
  position: [number, number];
  /** Where its line starts: the closed centre nearest to it. */
  from: [number, number];
}

const position = (c: CentreRow): [number, number] => [c.lon, c.lat];
// Near enough for picking the nearest of a few closed centres within Singapore.
const squaredDistance = (a: [number, number], b: [number, number]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

function boundsOf(points: [number, number][]): Bounds | null {
  if (points.length === 0) return null;
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Plays the ripple once each time the plan's result changes or Replay is pressed; settled at once with
// reduced motion. A new run starts from the first step, not from the last run's settled map.
function useRipple(result: PlanResult | null, replays: number): RippleFrame {
  const [run, setRun] = useState<{ result: PlanResult | null; replays: number; frame: RippleFrame }>({
    result: null,
    replays: 0,
    frame: SETTLED,
  });
  const reduced = prefersReducedMotion();
  useEffect(() => {
    if (!result || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const frame = rippleFrame(now - start);
      setRun({ result, replays, frame });
      if (!frame.done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result, replays, reduced]);
  if (reduced || !result) return SETTLED;
  return run.result === result && run.replays === replays ? run.frame : START;
}

// Page 1's map (#11, map layers): where the closed centres' diners go, with the ripple, the displaced
// blocks and the blocks that lose a walkable centre.
export function RippleMap({
  centres,
  closed,
  result,
  blocks,
  undercountNotes,
  onCentreClick,
  className,
}: RippleMapProps) {
  const [showBlocks, setShowBlocks] = useState(false);
  const [replays, setReplays] = useState(0);
  const frame = useRipple(result, replays);
  const centreById = useMemo(() => new Map(centres.map((c) => [c.centre_id, c])), [centres]);

  const receivers = useMemo<PlacedReceiver[]>(
    () =>
      (result?.receivers ?? []).flatMap((r) => {
        const c = centreById.get(r.centreId);
        if (!c || closed.length === 0) return [];
        const at = position(c);
        const from = closed
          .map(position)
          .reduce((best, p) => (squaredDistance(p, at) < squaredDistance(best, at) ? p : best));
        return [{ ...r, position: at, from }];
      }),
    [result, centreById, closed]
  );
  const top = useMemo(() => receivers.slice(0, TOP_RECEIVERS), [receivers]);
  const displaced = useMemo(
    () => (result?.displacedBlockIds ?? []).flatMap((id) => blocks.get(id) ?? []),
    [result, blocks]
  );
  const losingAccess = useMemo(
    () => (result?.accessLoss.senior.blockIds ?? []).flatMap((id) => blocks.get(id) ?? []),
    [result, blocks]
  );

  // Frame the closed centres and the centres taking most of their diners.
  const fitTo = useMemo(() => boundsOf([...closed.map(position), ...top.map((r) => r.position)]), [closed, top]);

  const layers = useMemo(() => {
    const shownIds = new Set([...receivers.map((r) => r.centreId), ...closed.map((c) => c.centre_id)]);
    const maxExtra = Math.max(1, ...receivers.map((r) => r.extraDinersPerDay));
    const maxShare = Math.max(0.01, ...top.map((r) => r.shareOfDisplaced));
    const radius = (r: PlacedReceiver) => (5 + 17 * Math.sqrt(r.extraDinersPerDay / maxExtra)) * frame.receivers;
    // Every flagged centre gets the ring: closed, receiving or neither.
    const undercounted = [
      ...closed.map((c) => ({ id: c.centre_id, at: position(c), size: 30 })),
      ...receivers.map((r) => ({ id: r.centreId, at: r.position, size: 2 * radius(r) + 10 })),
      ...centres.filter((c) => !shownIds.has(c.centre_id)).map((c) => ({ id: c.centre_id, at: position(c), size: 16 })),
    ].filter((f) => undercountNotes.has(f.id));

    const others = new ScatterplotLayer<CentreRow>({
      id: 'centres',
      data: centres.filter((c) => !shownIds.has(c.centre_id)),
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
    const blockDots = new ScatterplotLayer<BlockPoint>({
      id: 'blocks',
      data: showBlocks ? displaced : [],
      pickable: true,
      getPosition: (b) => [b.lon, b.lat],
      radiusUnits: 'pixels',
      getRadius: 3.5,
      getFillColor: (b) => rgb(blockBand(b.residents).hex, 230),
    });
    // Always drawn, so access loss is never hidden (#11, story 13).
    const accessRings = new ScatterplotLayer<BlockPoint>({
      id: 'access',
      data: losingAccess,
      pickable: true,
      getPosition: (b) => [b.lon, b.lat],
      radiusUnits: 'pixels',
      getRadius: 5,
      filled: false,
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 1.5,
      getLineColor: rgb(INK_HEX),
    });
    const rings = new ScatterplotLayer<CentreRow>({
      id: 'rings',
      data: frame.done ? [] : closed,
      getPosition: position,
      radiusUnits: 'pixels',
      getRadius: 8 + 52 * frame.rings,
      filled: false,
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 2,
      getLineColor: rgb(HIGHLIGHT_HEX, Math.round(220 * (1 - frame.rings))),
      updateTriggers: { getRadius: frame.rings, getLineColor: frame.rings },
    });
    const lines = new LineLayer<PlacedReceiver>({
      id: 'lines',
      data: frame.lines > 0 ? top : [],
      getSourcePosition: (r) => r.from,
      getTargetPosition: (r) => lerp(r.from, r.position, frame.lines),
      widthUnits: 'pixels',
      getWidth: (r) => 2 + 10 * (r.shareOfDisplaced / maxShare),
      getColor: rgb(HIGHLIGHT_HEX, 170),
      updateTriggers: { getTargetPosition: frame.lines },
    });
    const receiverDots = new ScatterplotLayer<PlacedReceiver>({
      id: 'receivers',
      data: receivers,
      pickable: true,
      getPosition: (r) => r.position,
      radiusUnits: 'pixels',
      // Area grows with extra diners
      getRadius: radius,
      stroked: true,
      lineWidthUnits: 'pixels',
      getLineWidth: 1.5,
      getLineColor: rgb(WHITE_HEX),
      getFillColor: rgb(RECEIVER_HEX, 200),
      updateTriggers: { getRadius: frame.receivers },
    });
    const undercountRings = new IconLayer<(typeof undercounted)[number]>({
      id: 'undercounted',
      data: undercounted,
      getPosition: (f) => f.at,
      getIcon: () => ({ url: DASHED_RING, id: 'dashed-ring', width: 64, height: 64, anchorX: 32, anchorY: 32 }),
      sizeUnits: 'pixels',
      getSize: (f) => f.size,
      updateTriggers: { getSize: frame.receivers },
    });
    const crosses = new TextLayer<CentreRow>({
      id: 'closed',
      data: closed,
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
      data: frame.done ? top : [],
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
    return [others, blockDots, accessRings, rings, lines, receiverDots, undercountRings, crosses, labels];
  }, [centres, closed, receivers, top, displaced, losingAccess, showBlocks, frame, undercountNotes]);

  // What hovering and clicking each pickable layer does, keyed by layer id.
  const pickCentre = (c: CentreRow) => canPick(c) && onCentreClick(c);
  const joinLines = (...lines: (string | null | undefined)[]) => lines.filter(Boolean).join('\n');
  const undercountLine = (id: string) => {
    const note = undercountNotes.get(id);
    return note && `Possibly under-counted: ${note}`;
  };
  const handlers: Record<string, { tooltip: (o: never) => string; click?: (o: never) => void }> = {
    centres: {
      tooltip: (c: CentreRow) =>
        joinLines(
          c.name,
          c.is_interim ? "Interim: stays open, so it can't be the anchor" : 'Click to make it the anchor',
          undercountLine(c.centre_id)
        ),
      click: pickCentre,
    },
    receivers: {
      tooltip: (r: PlacedReceiver) =>
        joinLines(
          r.name,
          `+${count(Math.round(r.extraDinersPerDay))} diners a day (${pctOverBaseline(r.pctOverBaseline)})`,
          `${r.extraDinersPerStall === null ? 'No stalls recorded' : `+${r.extraDinersPerStall.toFixed(1)} per stall`}` +
            ` · ${Math.round(r.shareOfDisplaced * 100)}% of displaced diners`,
          worstCaseNote(r.pctOverBaseline),
          undercountLine(r.centreId)
        ),
      click: (r: PlacedReceiver) => {
        const c = centreById.get(r.centreId);
        if (c) pickCentre(c);
      },
    },
    closed: {
      tooltip: (c: CentreRow) =>
        joinLines(
          c.name,
          c.centre_id === closed[0]?.centre_id ? 'Closed: the anchor' : 'Closed at the same time',
          undercountLine(c.centre_id)
        ),
    },
    blocks: { tooltip: (b: BlockPoint) => `Displaced block · ≈${count(roundTo10(b.residents))} residents` },
    access: {
      tooltip: (b: BlockPoint) =>
        `≈${count(roundTo10(b.residents))} residents\nLeft with no centre within ${WALK_LIMITS.limitMin} min at senior pace`,
    },
  };
  const getTooltip = ({ object, layer }: PickingInfo) =>
    object && layer ? (handlers[layer.id]?.tooltip(object as never) ?? null) : null;
  const onClick = ({ object, layer }: PickingInfo) => {
    if (object && layer) handlers[layer.id]?.click?.(object as never);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showBlocks ? 'default' : 'outline'}
          size="sm"
          aria-pressed={showBlocks}
          onClick={() => setShowBlocks((s) => !s)}
        >
          Displaced blocks
        </Button>
        <Button variant="outline" size="sm" disabled={!result} onClick={() => setReplays((n) => n + 1)}>
          ↻ Replay ripple
        </Button>
      </div>
      <BaseMap layers={layers} getTooltip={getTooltip} onClick={onClick} fitTo={fitTo} className={className} />
    </div>
  );
}
