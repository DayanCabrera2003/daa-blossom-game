import type { Rect } from './boxDistance';
import { dialogueBox } from './dialogueBox';
import { innerWidth, QUESTION_PANEL, TUTORIAL_PANEL } from './panelLayout';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from '../view/layout';

/**
 * Where each kind of panel may sit over the garden (the post-release fix of plan 09): the spots it
 * can take, the one it always took first, then the corners and middles of the room it has, then
 * every other spot on a grid of a few pixels. Which of them hides least of the garden is chosen by
 * `panelPlacement.ts`. Each kind keeps the room it always had: a question and the notebook end
 * above the dialogue box (a hint can be said beside them), a card's window above the toolbar, the
 * dialogue box above it too, a toast above the toolbar (or the drawer it sits on); none reaches
 * into the top bar, which stays readable. Pure.
 */

/** The kinds of panel a player can move, each remembered apart. */
export const PANEL_KINDS = ['question', 'notebook', 'card', 'recipe', 'dialogue', 'toast'] as const;

/** A kind of panel. */
export type PanelKind = (typeof PANEL_KINDS)[number];

/** How far apart the spots of the grid are, across and down. */
const GRID = { x: 8, y: 4 } as const;

/** The panels keep this far from the canvas's sides. */
const SIDE = 4;

/** The top of the room under the top bar, where a question or a card has always opened. */
const TOP = QUESTION_PANEL.y;

/** The narrower panel of a question, beside a piece of the garden rather than above it. */
export const NARROW_QUESTION = 232;

/** The positions from `low` to `high` a `step` apart, `high` itself always among them. */
function stops(low: number, high: number, step: number): number[] {
  if (high < low) return [];
  const at: number[] = [];
  for (let x = low; x < high; x += step) at.push(x);
  at.push(high);
  return at;
}

/**
 * The spots of a box `width` × `height` inside `region`: the nine corners and middles first (top
 * before bottom, left before right), then the rest of the grid. None when it does not fit.
 */
export function spotsIn(region: Rect, width: number, height: number): Rect[] {
  const right = region.x + region.width - width;
  const bottom = region.y + region.height - height;
  if (right < region.x || bottom < region.y) return [];
  const centre = Math.round((region.x + right) / 2);
  const middle = Math.round((region.y + bottom) / 2);
  const anchors = [region.y, bottom, middle].flatMap((y) =>
    [centre, region.x, right].map((x) => ({ x, y, width, height })),
  );
  const grid = stops(region.y, bottom, GRID.y).flatMap((y) =>
    stops(region.x, right, GRID.x).map((x) => ({ x, y, width, height })),
  );
  return [...anchors, ...grid];
}

/** The room a question and the notebook have: under the top bar, above the dialogue box. */
export const QUESTION_ROOM: Rect = {
  x: SIDE,
  y: TOP,
  width: CANVAS_WIDTH - 2 * SIDE,
  height: dialogueBox(false).box.y - TOP,
};

/** The room a card's window has: under the top bar, above the toolbar. */
export const CARD_ROOM: Rect = {
  x: SIDE,
  y: TOP,
  width: CANVAS_WIDTH - 2 * SIDE,
  height: LAYOUT.toolbarY - 1 - TOP,
};

/**
 * The spots of a question panel, whose height at a width is `heightAt(width)` and whose widest
 * option is `widest` pixels: as wide as it always was, where it always opened, first; then
 * narrower, when every option still fits a row of it.
 */
export function questionSpots(heightAt: (width: number) => number, widest: number): Rect[] {
  const { x, y, width } = QUESTION_PANEL;
  const home = { x, y, width, height: heightAt(width) };
  const narrow = widest <= innerWidth(NARROW_QUESTION) ? [NARROW_QUESTION] : [];
  return [home, ...[width, ...narrow].flatMap((w) => spotsIn(QUESTION_ROOM, w, heightAt(w)))];
}

/** The spots of the notebook's page, `height` tall: where it always opened first. */
export function notebookSpots(height: number): Rect[] {
  const { x, y, width } = QUESTION_PANEL;
  return [{ x, y, width, height }, ...spotsIn(QUESTION_ROOM, width, height)];
}

/** The spots of a card's window, `height` tall: where it always opened first. */
export function cardSpots(height: number): Rect[] {
  const { x, y, width } = TUTORIAL_PANEL;
  return [{ x, y, width, height }, ...spotsIn(CARD_ROOM, width, height)];
}

/** The spots of the dialogue box: over the bottom of the garden, as always, or under the top bar. */
export function dialogueSpots(): Rect[] {
  const { box } = dialogueBox(false);
  return [box, { ...box, y: LAYOUT.garden.y + 1 }];
}

/**
 * The spots of a toast whose panel `home` ends at the bottom of its room: there first, as always,
 * then anywhere between the top bar and that bottom.
 */
export function toastSpots(home: Rect): Rect[] {
  const top = LAYOUT.garden.y + 1;
  const room = {
    x: SIDE,
    y: top,
    width: CANVAS_WIDTH - 2 * SIDE,
    height: home.y + home.height - top,
  };
  return [home, ...spotsIn(room, home.width, home.height)];
}
