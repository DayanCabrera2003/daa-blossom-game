import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

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

/** The frame's size: the fill is 160 × 8 inside a one-pixel edge. */
const FRAME_WIDTH = 162;
const FRAME_HEIGHT = 10;

/**
 * The loading bar at `progress` (Phaser's 0 to 1), centred on the logical canvas. The fill grows
 * in whole pixels, so it stays crisp at any zoom, and a progress outside 0 to 1 is held to it.
 */
export function loadingBar(progress: number): LoadingBar {
  const frame: BarRect = {
    x: (CANVAS_WIDTH - FRAME_WIDTH) / 2,
    y: (CANVAS_HEIGHT - FRAME_HEIGHT) / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  };
  const inner = FRAME_WIDTH - 2;
  const held = Math.min(1, Math.max(0, progress));
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
