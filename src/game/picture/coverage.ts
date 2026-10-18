import type { Point } from '../input/target';
import { clipSegment, type Rect } from './boxDistance';

/**
 * How much of the garden a panel would hide (the post-release fix of plan 09): each piece the
 * garden draws (a sprout's body, its name, a lantern, a vine) as a shape, and how many pixels of it
 * a box covers. The panels choose where to sit by these numbers (`panelPlacement.ts`). Pure.
 */

/** A piece of the garden as a panel sees it: a box (a sprout, a name, a lantern) or a stroke. */
export type Shape =
  | { readonly kind: 'box'; readonly box: Rect }
  | { readonly kind: 'line'; readonly a: Point; readonly b: Point; readonly width: number };

/** The area two boxes share; 0 when they only touch or lie apart. */
function sharedArea(one: Rect, other: Rect): number {
  const width = Math.min(one.x + one.width, other.x + other.width) - Math.max(one.x, other.x);
  const height = Math.min(one.y + one.height, other.y + other.height) - Math.max(one.y, other.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * How many pixels of `shape` the box `rect` covers: the area they share for a box; for a stroke,
 * the length of it on the box grown by half its width on each side, times its width.
 */
export function coverage(rect: Rect, shape: Shape): number {
  if (shape.kind === 'box') return sharedArea(rect, shape.box);
  const { a, b, width } = shape;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length === 0) return 0;
  const half = width / 2;
  const grown = {
    x: rect.x - half,
    y: rect.y - half,
    width: rect.width + width,
    height: rect.height + width,
  };
  const range = clipSegment(grown, a, b);
  return range === null ? 0 : (range[1] - range[0]) * length * width;
}

/** How many pixels of all of `shapes` the box `rect` covers. */
export const totalCoverage = (rect: Rect, shapes: readonly Shape[]): number =>
  shapes.reduce((sum, shape) => sum + coverage(rect, shape), 0);
