import type { Point } from '../input/target';

/**
 * How far a box lies from a point, from a segment and from another box, in canvas pixels. The
 * backdrop keeps its ornaments clear of the sprouts and vines with these, and the hub keeps its
 * garden clear of the signs, titles and buttons.
 */

/** A box on the canvas: its top-left corner and its size. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** How far `point` is from the nearest point of `box`; 0 when it lies inside or on an edge. */
export function distanceToPoint(box: Rect, point: Point): number {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.width));
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

/** How far `point` is from the segment `a`–`b`. */
function pointToSegment(point: Point, a: Point, b: Point): number {
  const [vx, vy] = [b.x - a.x, b.y - a.y];
  const length = vx * vx + vy * vy;
  const t =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * vx + (point.y - a.y) * vy) / length));
  return Math.hypot(point.x - (a.x + t * vx), point.y - (a.y + t * vy));
}

/**
 * Whether the segment `a`–`b` touches `box`, by clipping it to the box's four sides in turn
 * (Liang–Barsky): what is left of the segment's parameter range after each side is the part on its
 * inner side, and the segment touches the box when something is left.
 */
function crosses(box: Rect, a: Point, b: Point): boolean {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  let [low, high] = [0, 1];
  // Each side as p·t ≤ q: left, right, top, bottom.
  const sides: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.width - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.height - a.y],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) low = Math.max(low, t);
    else high = Math.min(high, t);
    if (low > high) return false;
  }
  return true;
}

/**
 * How far the segment `a`–`b` is from `box`: 0 when it touches it; otherwise the nearest of its
 * ends to the box and of the box's corners to it, where the nearest two points must lie.
 */
export function distanceToSegment(box: Rect, a: Point, b: Point): number {
  if (crosses(box, a, b)) return 0;
  const corners: Point[] = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ];
  return Math.min(
    distanceToPoint(box, a),
    distanceToPoint(box, b),
    ...corners.map((corner) => pointToSegment(corner, a, b)),
  );
}

/** Whether two boxes come closer than `gap` to each other (touching edges count with a gap). */
export function boxesOverlap(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap &&
    b.x < a.x + a.width + gap &&
    a.y < b.y + b.height + gap &&
    b.y < a.y + a.height + gap
  );
}
