// The ripple's three steps (#11, map layers; #16): rings spread from the closed centres, then lines
// draw out to the top receivers, then receivers grow to their size with labels. Each part runs 0 → 1.
export interface RippleFrame {
  rings: number;
  lines: number;
  receivers: number;
  done: boolean;
}

export const SETTLED: RippleFrame = { rings: 1, lines: 1, receivers: 1, done: true };
export const RIPPLE_STEP_MS = 600;

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function rippleFrame(elapsedMs: number, stepMs: number = RIPPLE_STEP_MS): RippleFrame {
  if (elapsedMs >= 3 * stepMs) return SETTLED;
  return {
    rings: clamp(elapsedMs / stepMs),
    lines: clamp((elapsedMs - stepMs) / stepMs),
    receivers: clamp((elapsedMs - 2 * stepMs) / stepMs),
    done: false,
  };
}
