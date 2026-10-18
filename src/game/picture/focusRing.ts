import type { Rect } from './boxDistance';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * The ring round the thing the keyboard is on (plan 09, phase 4): a line of one pixel in the light
 * of a lantern, with one pixel of air between it and the box, so it never covers a label. Where the
 * box reaches the edge of the canvas the ring's side is pulled in to stay on it, at worst onto the
 * box's outermost pixel, which on a button is wood and never a letter. Pure: the scene's focus
 * controller paints the four sides this gives.
 */
export const FOCUS_RING = {
  /** The palette's colour of the ring: the amber of a lit lantern. */
  colour: 'lit',
  /** The air between the box and the ring. */
  air: 1,
} as const;

/** The four sides of the ring round `box`, as one-pixel rectangles kept on the canvas. */
export function focusRing(box: Rect): Rect[] {
  const out = FOCUS_RING.air + 1;
  const left = Math.max(0, box.x - out);
  const top = Math.max(0, box.y - out);
  const right = Math.min(CANVAS_WIDTH - 1, box.x + box.width - 1 + out);
  const bottom = Math.min(CANVAS_HEIGHT - 1, box.y + box.height - 1 + out);
  const width = right - left + 1;
  const height = bottom - top + 1;
  return [
    { x: left, y: top, width, height: 1 },
    { x: left, y: bottom, width, height: 1 },
    { x: left, y: top + 1, width: 1, height: height - 2 },
    { x: right, y: top + 1, width: 1, height: height - 2 },
  ];
}
