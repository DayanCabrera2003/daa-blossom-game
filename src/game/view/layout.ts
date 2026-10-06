import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Where the greybox HUD sits on the 480×270 canvas: a top bar (goal, lanterns, water, the sun) and
 * two bottom rows (the tools, then the buttons), so that all six tools and five buttons always
 * fit. Level files keep their sprouts between, in y 28–226 (enforced by the level schema).
 */
export const LAYOUT = {
  margin: 4,
  topY: 3,
  secondY: 13,
  toolbarY: CANVAS_HEIGHT - 27,
  bottomY: CANVAS_HEIGHT - 13,
  sunTrack: { x0: CANVAS_WIDTH - 150, x1: CANVAS_WIDTH - 10, y: 8 },
  toastY: CANVAS_HEIGHT - 38,
  dialogue: { x: 40, y: CANVAS_HEIGHT - 82, width: CANVAS_WIDTH - 80, height: 40 },
} as const;
