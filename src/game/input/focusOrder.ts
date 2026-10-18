import { itemAt } from '@core/shared/itemAt';
import type { Rect } from '../picture/boxDistance';

/**
 * The keyboard's focus on a screen of the canvas (plan 09, phase 4): which pressable things it can
 * reach, in what order Tab and the arrows visit them, and where it goes when a panel opens or
 * closes. The keyboard only emulates the pointer: it reaches what a touch could reach, no more.
 * Pure: the scene's focus controller hands the boxes in and moves the ring where this says. Spots
 * are named by an id of the caller's choosing, so the focus survives the screen changing.
 */

/** A pressable thing on the screen: its id, the box it covers and the depth it is drawn at. */
export interface FocusSpot<T> {
  readonly id: T;
  readonly box: Rect;
  readonly depth: number;
}

/** A layer that takes the touches meant for what lies below it (a panel's dim layer). */
export interface FocusCover {
  readonly box: Rect;
  readonly depth: number;
}

/** A key that moves the focus: Tab, Shift+Tab, or an arrow. */
export type FocusMove = 'next' | 'previous' | 'up' | 'down' | 'left' | 'right';

/** Where the focus is, the topmost layer seen, and where it was before each layer opened above. */
export interface FocusState<T> {
  /** The spot in focus; null while the keyboard is not in use. */
  readonly current: T | null;
  /** The topmost layer of the screen when the focus last looked (-1 for an empty screen). */
  readonly top: number;
  /** The spots in focus before the layers above opened, the latest last. */
  readonly saved: readonly T[];
}

/**
 * The layer of a depth: the game draws in bands of a hundred (the HUD at 100, the dialogue and the
 * question panels at 200, the victory at 300, the settings at 400), so a panel opening above is a
 * new layer.
 */
export const focusLayer = (depth: number): number => Math.floor(depth / 100);

/** Whether `point` lies inside `box`. */
const inside = (box: Rect, x: number, y: number): boolean =>
  x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;

/** The centre of a box. */
const centre = (box: Rect): { readonly x: number; readonly y: number } => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

/**
 * The spots the keyboard can reach: those whose centre no cover drawn above them hides, as such a
 * cover would take the pointer's touch too.
 */
export function reachable<T>(
  spots: readonly FocusSpot<T>[],
  covers: readonly FocusCover[],
): FocusSpot<T>[] {
  return spots.filter((spot) => {
    const { x, y } = centre(spot.box);
    return !covers.some((cover) => cover.depth > spot.depth && inside(cover.box, x, y));
  });
}

/**
 * The boxes in rows, top to bottom: a box whose centre lies within the height of a row's first box
 * joins that row (so a box a pixel lower still reads in its row), and each row reads left to right.
 * Indices into `boxes`.
 */
function rowsOf(boxes: readonly Rect[]): number[][] {
  const byTop = boxes.map((_, i) => i).sort((a, b) => itemAt(boxes, a).y - itemAt(boxes, b).y);
  const rows: { readonly head: Rect; readonly members: number[] }[] = [];
  for (const i of byTop) {
    const box = itemAt(boxes, i);
    const { y } = centre(box);
    const row = rows.find(({ head }) => y >= head.y && y < head.y + head.height);
    if (row === undefined) rows.push({ head: box, members: [i] });
    else row.members.push(i);
  }
  return rows.map(({ members }) =>
    [...members].sort((a, b) => itemAt(boxes, a).x - itemAt(boxes, b).x),
  );
}

/** The order the keyboard reads the boxes in: row by row, each left to right. Indices into `boxes`. */
export function readingOrder(boxes: readonly Rect[]): number[] {
  return rowsOf(boxes).flat();
}

/** The topmost layer among `spots`, or -1 when there is none. */
const topOf = <T>(spots: readonly FocusSpot<T>[]): number =>
  spots.reduce((top, spot) => Math.max(top, focusLayer(spot.depth)), -1);

/** The spot the focus starts on: the first, in reading order, of the topmost layer. */
export function firstSpot<T>(spots: readonly FocusSpot<T>[]): T | null {
  const top = topOf(spots);
  const layer = spots.filter((spot) => focusLayer(spot.depth) === top);
  const [first] = readingOrder(layer.map((spot) => spot.box));
  return first === undefined ? null : itemAt(layer, first).id;
}

/**
 * Where `move` takes the focus from `current` among `spots`: Tab and the side arrows walk the
 * reading order round (Shift+Tab and the left arrow backwards), the up and down arrows go to the
 * spot of the row above or below whose centre is nearest across, and stay on the first or last row.
 * With nothing in focus (or a spot gone) any move starts at the first spot.
 */
export function moveFocus<T>(
  spots: readonly FocusSpot<T>[],
  current: T | null,
  move: FocusMove,
): T | null {
  const boxes = spots.map((spot) => spot.box);
  const at = spots.findIndex((spot) => spot.id === current);
  if (current === null || at < 0) return firstSpot(spots);
  const idOf = (i: number | undefined): T => (i === undefined ? current : itemAt(spots, i).id);
  if (move === 'up' || move === 'down') {
    const rows = rowsOf(boxes);
    const row = rows.findIndex((members) => members.includes(at));
    const target = rows[row + (move === 'up' ? -1 : 1)];
    if (target === undefined) return current;
    const x = centre(itemAt(boxes, at)).x;
    const across = (i: number): number => Math.abs(centre(itemAt(boxes, i)).x - x);
    return idOf([...target].sort((a, b) => across(a) - across(b))[0]);
  }
  const order = readingOrder(boxes);
  const place = order.indexOf(at);
  const step = move === 'next' || move === 'right' ? 1 : -1;
  return idOf(order[(place + step + order.length) % order.length]);
}

/**
 * The focus after the screen changed to `spots`. A layer opening above takes the focus to its first
 * spot and remembers where it was; while the spot in focus is there it keeps it (also a spot of a
 * lower layer the player went to with Tab); when it is gone (its panel closed) the focus goes back
 * to the latest remembered spot still there, or else to the first spot. Without the keyboard in use
 * (`current` null) nothing takes the focus, but the top layer is followed.
 */
export function refocus<T>(state: FocusState<T>, spots: readonly FocusSpot<T>[]): FocusState<T> {
  const top = topOf(spots);
  const { current, saved } = state;
  if (current === null) return { current, top, saved: [] };
  const present = (id: T): boolean => spots.some((spot) => spot.id === id);
  if (top > state.top) return { current: firstSpot(spots), top, saved: [...saved, current] };
  if (present(current)) return top === state.top ? state : { current, top, saved };
  for (let i = saved.length - 1; i >= 0; i -= 1) {
    const back = itemAt(saved, i);
    if (present(back)) return { current: back, top, saved: saved.slice(0, i) };
  }
  return { current: firstSpot(spots), top, saved: [] };
}
