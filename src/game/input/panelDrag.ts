import type { Rect } from '../picture/boxDistance';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { HIT_PADDING } from './hitPadding';
import type { Point } from './target';

/**
 * Dragging a panel by its frame (the post-release fix of plan 09): where a press may grab it (its
 * frame, never a button nor the touch zone a button grows round its wood, so a drag never presses
 * an answer), when a press becomes a drag, where the panel follows the finger, the double touch that
 * sends it back to where it places itself, and the nudge of Alt and an arrow. A panel always stays
 * whole on the canvas. Pure: the views ask with the pointer and the boxes as they are.
 */
export const PANEL_DRAG = {
  /** How far a press must move, in logical pixels, before it drags (less is still a touch). */
  start: 3,
  /** The most time between the two touches of a double touch, in milliseconds. */
  doubleTapMs: 350,
  /** The farthest apart the two touches of a double touch may land, in logical pixels. */
  doubleTapReach: 8,
  /** How far Alt and an arrow move a panel, in logical pixels. */
  keyStep: 4,
} as const;

/** A panel's size, which a move keeps. */
export interface PanelSize {
  readonly width: number;
  readonly height: number;
}

/** A touch: where and when. */
export interface Tap {
  readonly at: Point;
  readonly time: number;
}

/** A way Alt and an arrow move a panel. */
export type NudgeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * The top-left corner nearest `at`, on whole pixels, that keeps a panel of `size` whole on the
 * canvas; a panel larger than the canvas keeps its corner on it.
 */
export function clampToCanvas(at: Point, size: PanelSize): Point {
  const clamp = (value: number, room: number): number =>
    Math.max(0, Math.min(Math.max(0, room), Math.round(value)));
  return { x: clamp(at.x, CANVAS_WIDTH - size.width), y: clamp(at.y, CANVAS_HEIGHT - size.height) };
}

/** Whether a press at `grab` that has reached `now` drags, rather than touches. */
export const isDrag = (grab: Point, now: Point): boolean =>
  Math.hypot(now.x - grab.x, now.y - grab.y) >= PANEL_DRAG.start;

/**
 * Where a panel of `size` whose corner was at `origin` when the press grabbed it at `grab` goes
 * with the pointer at `now`: it follows the pointer, kept on the canvas.
 */
export const draggedTo = (origin: Point, grab: Point, now: Point, size: PanelSize): Point =>
  clampToCanvas({ x: origin.x + now.x - grab.x, y: origin.y + now.y - grab.y }, size);

/** Whether `point` lies on `box`, grown by `pad` on each side. */
const on = (box: Rect, point: Point, pad = 0): boolean =>
  point.x >= box.x - pad &&
  point.x <= box.x + box.width + pad &&
  point.y >= box.y - pad &&
  point.y <= box.y + box.height + pad;

/**
 * Whether a press at `point` grabs the panel: on one of its `grips` (its frame, or the part of it
 * that moves it), and on none of its `handles` (its buttons, rows and cards) nor the touch zone
 * each grows round it.
 */
export const isGrip = (point: Point, grips: readonly Rect[], handles: readonly Rect[]): boolean =>
  grips.some((grip) => on(grip, point)) &&
  !handles.some((handle) => on(handle, point, HIT_PADDING.max));

/** Whether `tap` makes a double touch with the touch before it, `previous`. */
export const isDoubleTap = (previous: Tap | null, tap: Tap): boolean =>
  previous !== null &&
  tap.time - previous.time <= PANEL_DRAG.doubleTapMs &&
  Math.hypot(tap.at.x - previous.at.x, tap.at.y - previous.at.y) <= PANEL_DRAG.doubleTapReach;

/** Where Alt and an arrow move a panel of `size` with its corner at `at`. */
export function nudged(at: Point, direction: NudgeDirection, size: PanelSize): Point {
  const step = PANEL_DRAG.keyStep;
  const moves: Readonly<Record<NudgeDirection, readonly [number, number]>> = {
    up: [0, -step],
    down: [0, step],
    left: [-step, 0],
    right: [step, 0],
  };
  const [dx, dy] = moves[direction];
  return clampToCanvas({ x: at.x + dx, y: at.y + dy }, size);
}
