import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Where the greybox HUD sits on the 480×270 canvas: a top bar (goal, lanterns, water, the sun) and
 * two bottom rows (the tools, then the buttons), so that all six tools and seven buttons always
 * fit. Level files keep their sprouts between, in y 28–226 (enforced by the level schema). Questions
 * open over the garden, under the top bar and above the dialogue box.
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
  /** The garden between the bars: what a question blocks and a bet's veil covers. */
  garden: { y: 24, height: CANVAS_HEIGHT - 27 - 2 - 24 },
  /** The question panel, near the top so the dialogue box below stays free. */
  question: { x: 60, y: 30, width: CANVAS_WIDTH - 120 },
} as const;
