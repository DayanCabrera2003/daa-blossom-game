import type { Rect } from './boxDistance';
import { contrast } from './contrast';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { PALETTE } from '../view/palette';

/**
 * The ring round the thing the keyboard is on (plan 09, phase 4): two lines of one pixel, a light
 * one two pixels out from the box and a dark one between it and the box, so it never covers a
 * label. One light line alone, the amber of a lantern, read only 2.45:1 on the wooden panels
 * (the review of phase 4); a light and a dark line side by side always leave one of them at least
 * 3:1 from whatever lies under the ring, the contrast WCAG asks of a focus indicator, whatever the
 * ground, wood, water or page. Where the box reaches the edge of the canvas the ring's sides are
 * pulled in to stay on it, at worst onto the box's outermost pixel, which on a button is wood and
 * never a letter. Pure: the scene's focus controller paints the lines this gives.
 */
export const FOCUS_RING = {
  /** The palette's colour of the outer line: the pale glow of a lit lantern. */
  light: 'litGlow',
  /** The palette's colour of the inner line, between the light one and the box: the pack's ink. */
  dark: 'ink',
} as const;

/** The two lines of a ring, each as four one-pixel rectangles kept on the canvas. */
export interface FocusRingLines {
  readonly light: readonly Rect[];
  readonly dark: readonly Rect[];
}

/** The four sides of a one-pixel frame `out` pixels out from `box`, kept on the canvas. */
function frame(box: Rect, out: number): Rect[] {
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

/** The ring round `box`: the light line two pixels out, the dark one a pixel out. */
export const focusRing = (box: Rect): FocusRingLines => ({
  light: frame(box, 2),
  dark: frame(box, 1),
});

/** How far the ring stands out from `surface` (0xRRGGBB): its line that contrasts most with it. */
export const ringContrast = (surface: number): number =>
  Math.max(
    contrast(PALETTE[FOCUS_RING.light], surface),
    contrast(PALETTE[FOCUS_RING.dark], surface),
  );
