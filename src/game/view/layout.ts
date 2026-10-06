import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Where the greybox HUD sits on the 480×270 canvas: a top bar (goal, lanterns, water, the sun) and
 * a bottom bar (tools on the left, buttons on the right). Level files keep their sprouts between.
 */
export const LAYOUT = {
  margin: 4,
  topY: 3,
  secondY: 13,
  bottomY: CANVAS_HEIGHT - 13,
  sunTrack: { x0: CANVAS_WIDTH - 150, x1: CANVAS_WIDTH - 10, y: 8 },
  toastY: CANVAS_HEIGHT - 28,
  dialogue: { x: 40, y: CANVAS_HEIGHT - 70, width: CANVAS_WIDTH - 80, height: 40 },
} as const;
