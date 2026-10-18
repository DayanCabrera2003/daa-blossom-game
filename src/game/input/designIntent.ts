import type { Design, DesignEdit } from '@levels/sandbox/design';
import { SPROUT_HIT_RADIUS, VINE_HIT_DISTANCE } from './HitTest';
import type { Point } from './target';

/**
 * The free mode's editor under the hand (plan 08, phase 11): from the tool in hand, a press, the
 * moves while pressed and the release, and what lies under them, the edit of the design to ask the
 * reducer for. Pure, like the level's pointer (`pointer.ts`): the editor scene only forwards the
 * pointer here, so what a player can do is exactly what the tests of this module do.
 *
 * - Sprout: a touch on the grass plants one; dragging a sprout moves it.
 * - Vine: a touch on a sprout chooses it and a touch on another grows the vine between them, or
 *   takes it away if it is there; a drag from one sprout to another does the same.
 * - Lantern: a touch on a vine lights it, or puts its lantern out.
 * - Move: dragging a sprout moves it.
 * - Remove: a touch on a sprout takes it away with its vines; on a vine, the vine.
 */

/** A tool of the editor, in the order its bar shows them. */
export const DESIGN_TOOLS = ['sprout', 'vine', 'lantern', 'move', 'remove'] as const;

/** A tool of the editor. */
export type DesignTool = (typeof DESIGN_TOOLS)[number];

/** What lies under the pointer in a design: a sprout by name, a vine by its two, or the grass. */
export type DesignTarget =
  | { readonly kind: 'sprout'; readonly label: string }
  | { readonly kind: 'vine'; readonly u: string; readonly v: string }
  | { readonly kind: 'grass' };

/** A press held down: what it started on, where, where the pointer is now, and if it dragged. */
export interface DesignPress {
  readonly target: DesignTarget;
  readonly from: Point;
  readonly at: Point;
  /** Whether the pointer has gone further than `DRAG_THRESHOLD` from where it was pressed. */
  readonly dragging: boolean;
}

/** What the editor's pointer remembers between events. */
export interface DesignPointer {
  readonly tool: DesignTool;
  /** The sprout chosen by a first touch of the vine tool, waiting for the second. */
  readonly selected: string | null;
  /** The press held down, or null. */
  readonly press: DesignPress | null;
}

/**
 * How far a pressed pointer may go, in pixels, and still be a touch rather than a drag: a hand
 * that shakes a little on a touchpad still plants where it meant to.
 */
export const DRAG_THRESHOLD = 3;

/** The pointer holding `tool`, with nothing chosen nor pressed. */
export const initialDesignPointer = (tool: DesignTool): DesignPointer => ({
  tool,
  selected: null,
  press: null,
});

/** Takes another tool; a sprout chosen with the previous one is let go. */
export const chooseDesignTool = (_pointer: DesignPointer, tool: DesignTool): DesignPointer =>
  initialDesignPointer(tool);

/** Distance from a point to the segment a–b. */
const toSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/**
 * What a touch at `point` lands on: the nearest sprout within its circle (as in a level, `HitTest`),
 * else the nearest vine within reach of its line, else the grass.
 */
export function designHit(design: Design, point: Point): DesignTarget {
  const distance = (sprout: Point): number => Math.hypot(point.x - sprout.x, point.y - sprout.y);
  let sprout: { label: string; distance: number } | null = null;
  for (const candidate of design.sprouts) {
    const d = distance(candidate);
    if (d <= SPROUT_HIT_RADIUS && (sprout === null || d < sprout.distance)) {
      sprout = { label: candidate.label, distance: d };
    }
  }
  if (sprout !== null) return { kind: 'sprout', label: sprout.label };
  const place = new Map(design.sprouts.map((s) => [s.label, s]));
  let vine: { u: string; v: string; distance: number } | null = null;
  for (const [u, v] of design.vines) {
    const [a, b] = [place.get(u), place.get(v)];
    if (a === undefined || b === undefined) continue;
    const d = toSegment(point, a, b);
    if (d <= VINE_HIT_DISTANCE && (vine === null || d < vine.distance))
      vine = { u, v, distance: d };
  }
  return vine === null ? { kind: 'grass' } : { kind: 'vine', u: vine.u, v: vine.v };
}

/** A press at `point`: remembered with what it landed on, until it is released. */
export function designPress(pointer: DesignPointer, design: Design, point: Point): DesignPointer {
  return {
    ...pointer,
    press: { target: designHit(design, point), from: point, at: point, dragging: false },
  };
}

/** A move while pressed; once it has gone past the threshold, the press is a drag for good. */
export function designMove(pointer: DesignPointer, point: Point): DesignPointer {
  const { press } = pointer;
  if (press === null) return pointer;
  const far = Math.hypot(point.x - press.from.x, point.y - press.from.y) >= DRAG_THRESHOLD;
  return { ...pointer, press: { ...press, at: point, dragging: press.dragging || far } };
}

/** The pointer and the edit a release leads to (null when it edits nothing). */
interface Released {
  readonly pointer: DesignPointer;
  readonly edit: DesignEdit | null;
}

/** A touch with the vine tool: choose a sprout, or grow the vine from the one chosen. */
function vineTouch(pointer: DesignPointer, target: DesignTarget): Released {
  const idle = { ...pointer, selected: null };
  if (target.kind !== 'sprout' || target.label === pointer.selected)
    return { pointer: idle, edit: null };
  if (pointer.selected === null)
    return { pointer: { ...pointer, selected: target.label }, edit: null };
  return { pointer: idle, edit: { type: 'toggleVine', u: pointer.selected, v: target.label } };
}

/** A touch (a press and a release without dragging) on `target` at `point`. */
function touch(pointer: DesignPointer, target: DesignTarget, point: Point): Released {
  const none: Released = { pointer, edit: null };
  switch (pointer.tool) {
    case 'sprout':
      return target.kind === 'sprout'
        ? none
        : { pointer, edit: { type: 'addSprout', x: Math.round(point.x), y: Math.round(point.y) } };
    case 'vine':
      return vineTouch(pointer, target);
    case 'lantern':
      return target.kind === 'vine'
        ? { pointer, edit: { type: 'toggleLantern', u: target.u, v: target.v } }
        : none;
    case 'move':
      return none;
    case 'remove':
      if (target.kind === 'sprout') {
        return { pointer, edit: { type: 'removeSprout', label: target.label } };
      }
      return target.kind === 'vine'
        ? { pointer, edit: { type: 'toggleVine', u: target.u, v: target.v } }
        : none;
  }
}

/** A drag from `from` (what it was pressed on) released at `point` over `over`. */
function dragged(
  pointer: DesignPointer,
  from: DesignTarget,
  over: DesignTarget,
  point: Point,
): Released {
  const none: Released = { pointer, edit: null };
  if (from.kind !== 'sprout') return none;
  const { tool } = pointer;
  if (tool === 'sprout' || tool === 'move') {
    return {
      pointer,
      edit: {
        type: 'moveSprout',
        label: from.label,
        x: Math.round(point.x),
        y: Math.round(point.y),
      },
    };
  }
  if (tool !== 'vine' || over.kind !== 'sprout') return none;
  // Dragged back onto the sprout it started from: as good as a touch on it.
  if (over.label === from.label) return vineTouch(pointer, over);
  return {
    pointer: { ...pointer, selected: null },
    edit: { type: 'toggleVine', u: from.label, v: over.label },
  };
}

/**
 * A release at `point`: a drag moves the sprout it started on (sprout and move tools) or grows a
 * vine to the sprout it ends on (vine tool); anything else is a touch on what lies under the
 * release. The press is forgotten either way.
 */
export function designRelease(pointer: DesignPointer, design: Design, point: Point): Released {
  const { press } = pointer;
  if (press === null) return { pointer, edit: null };
  const released: DesignPointer = { ...pointer, press: null };
  const over = designHit(design, point);
  return press.dragging
    ? dragged(released, press.target, over, point)
    : touch(released, over, point);
}
