import { ScatterplotLayer } from '@deck.gl/layers';
import type { Centre } from './centres';
import { HIGHLIGHT_HEX, INTERIM_HEX, rgb, WHITE_HEX } from './mapColours';

interface CentresLayerOptions {
  centres: readonly Centre[];
  // The centre picked to close, drawn largest.
  pickedId: string | null;
  // Every centre closed in the scenario, the picked one included: white with a highlight ring.
  closedIds: ReadonlySet<string>;
}

// Hawker centres as the wireframe draws them: highlight dots, interim centres grey, closed centres
// as rings. Pickable, so a page's BaseMap onClick can close one (check canPick first).
export function centresLayer({ centres, pickedId, closedIds }: CentresLayerOptions) {
  const closed = (c: Centre) => closedIds.has(c.centre_id);
  return new ScatterplotLayer<Centre>({
    id: 'centres',
    data: centres as Centre[],
    pickable: true,
    getPosition: (c) => [c.lon, c.lat],
    radiusUnits: 'pixels',
    getRadius: (c) => (c.centre_id === pickedId ? 8 : closed(c) ? 6 : 5),
    stroked: true,
    lineWidthUnits: 'pixels',
    getLineWidth: (c) => (closed(c) ? 3 : 1),
    getLineColor: (c) => rgb(closed(c) ? HIGHLIGHT_HEX : WHITE_HEX),
    getFillColor: (c) => rgb(closed(c) ? WHITE_HEX : c.is_interim ? INTERIM_HEX : HIGHLIGHT_HEX),
    updateTriggers: {
      getRadius: [pickedId, closedIds],
      getLineWidth: [closedIds],
      getLineColor: [closedIds],
      getFillColor: [closedIds],
    },
  });
}
