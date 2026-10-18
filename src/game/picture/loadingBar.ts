import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import type { PALETTE } from '../view/palette';

/** A rectangle in logical pixels. */
export interface BarRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The bar shown while the boot group loads: its frame and the part already filled. */
export interface LoadingBar {
  readonly frame: BarRect;
  readonly fill: BarRect;
}

/**
 * The colours of the bar: its edge, what has loaded and what has not. They are the colours of the
 * lantern `index.html` draws before the script (its edge and its light) on the same dark ground,
 * where the bar appears, so the bar takes over from it with no jump in place or tone.
 */
export const LOADING_TONES = {
  edge: 'panelEdge',
  fill: 'lit',
  empty: 'background',
} as const satisfies Readonly<Record<string, keyof typeof PALETTE>>;

/** The frame's size: the fill is 160 × 8 inside a one-pixel edge. */
const FRAME_WIDTH = 162;
const FRAME_HEIGHT = 10;

/**
 * The loading bar at `progress` (Phaser's 0 to 1), centred on the logical canvas. The fill grows
 * in whole pixels, so it stays crisp at any zoom; a progress outside 0 to 1 is held to it, and one
 * that is not a number leaves the bar empty.
 */
export function loadingBar(progress: number): LoadingBar {
  const frame: BarRect = {
    x: (CANVAS_WIDTH - FRAME_WIDTH) / 2,
    y: (CANVAS_HEIGHT - FRAME_HEIGHT) / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  };
  const inner = FRAME_WIDTH - 2;
  const held = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  return {
    frame,
    fill: {
      x: frame.x + 1,
      y: frame.y + 1,
      width: Math.floor(held * inner),
      height: FRAME_HEIGHT - 2,
    },
  };
}
