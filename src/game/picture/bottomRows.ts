import { CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * The two bottom rows of the level HUD on the 480×270 canvas: the tools, left to right from the
 * left margin, and under them the buttons, right to left from the right margin. Pure: the views
 * measure their buttons and place them where this says; the tests measure the labels of the game
 * the way a button sizes itself, so a label too long for the canvas is caught before it ships.
 */
export const BOTTOM_ROWS = {
  /** Clear space at the left and right edges of the canvas. */
  margin: 4,
  /** Between two buttons side by side. */
  gap: 3,
  /** What a button's panel adds to the width of its label: two pixels on each side. */
  padding: 4,
} as const;

/**
 * How far one letter of the greybox face advances: a monospace face 8 px high is 0.6 em wide per
 * letter in the common faces (4.8 px), rounded up so an estimate never falls short.
 */
export const CHAR_ADVANCE = 5;

/** The HUD buttons, in the order they are laid out from the right edge. */
export const HUD_BUTTONS = [
  'back',
  'help',
  'hint',
  'redo',
  'undo',
  'done',
  'checkMirror',
  'leaveLayer',
] as const;

/** A HUD button. */
export type HudButton = (typeof HUD_BUTTONS)[number];

/**
 * The width of a button showing `label`, as `Button` sizes itself: its text, one advance per
 * letter (an accented letter is one), plus the padding of its panel.
 */
export const estimatedButtonWidth = (label: string, advance: number = CHAR_ADVANCE): number =>
  [...label].length * advance + BOTTOM_ROWS.padding;

/** The left edge of each tool's panel, given their widths: left to right from the margin. */
export function toolbarRow(widths: readonly number[]): number[] {
  let x: number = BOTTOM_ROWS.margin;
  return widths.map((width) => {
    const left = x;
    x += width + BOTTOM_ROWS.gap;
    return left;
  });
}

/**
 * The left edge of each HUD button's panel, given their widths in `HUD_BUTTONS` order: right to
 * left from the margin, a gap before each, so the first button ends a gap short of the margin.
 */
export function hudRow(widths: readonly number[]): number[] {
  let x: number = CANVAS_WIDTH - BOTTOM_ROWS.margin;
  return widths.map((width) => {
    x -= width + BOTTOM_ROWS.gap;
    return x;
  });
}
