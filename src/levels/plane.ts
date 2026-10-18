/**
 * The plane geometry of a level's layout, in canvas pixels: whether two vines cross, and whether a
 * box (a sprout's name) comes too close to another box, a circle, a diamond or a segment.
 * `layoutChecks.ts` asks these; they know nothing of levels.
 */

/** A point on the canvas. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A box on the canvas, from its left and top edges to its right and bottom ones. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The sign of the turn from `a`–`b` to `a`–`c`: 1 to the left, −1 to the right, 0 in line. */
function turn(a: Point, b: Point, c: Point): number {
  return Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
}

/** Whether `q`, already in line with `a`–`b`, lies on the segment between them. */
const within = (a: Point, q: Point, b: Point): boolean =>
  Math.min(a.x, b.x) <= q.x &&
  q.x <= Math.max(a.x, b.x) &&
  Math.min(a.y, b.y) <= q.y &&
  q.y <= Math.max(a.y, b.y);

const same = (p: Point, q: Point): boolean => p.x === q.x && p.y === q.y;

/**
 * Whether the segments `a`–`b` and `c`–`d` cross: they meet anywhere but at an end both share. Two
 * vines of one sprout start at the same point and part there; they cross only when one runs along
 * the other.
 */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  // An end the two share: the other ends must leave it in different directions.
  const shared = [
    [a, b, c, d],
    [a, b, d, c],
    [b, a, c, d],
    [b, a, d, c],
  ].find(([s, , t]) => same(s as Point, t as Point));
  if (shared !== undefined) {
    const [s, u, , v] = shared as [Point, Point, Point, Point];
    const along = (u.x - s.x) * (v.x - s.x) + (u.y - s.y) * (v.y - s.y) > 0;
    return turn(s, u, v) === 0 && along;
  }
  const [abc, abd, cda, cdb] = [turn(a, b, c), turn(a, b, d), turn(c, d, a), turn(c, d, b)];
  // Each segment has the ends of the other on its two sides (or one end on its line).
  if (abc !== abd && cda !== cdb) return true;
  // Otherwise they meet only where an end lies on the other segment, in line with it.
  return (
    (abc === 0 && within(a, c, b)) ||
    (abd === 0 && within(a, d, b)) ||
    (cda === 0 && within(c, a, d)) ||
    (cdb === 0 && within(c, b, d))
  );
}

/** Whether two boxes overlap or keep fewer than `clearance` pixels between them. */
export function boxesNear(one: Box, other: Box, clearance: number): boolean {
  return (
    one.left - clearance < other.right &&
    other.left - clearance < one.right &&
    one.top - clearance < other.bottom &&
    other.top - clearance < one.bottom
  );
}

/** Whether a circle reaches into a box or into the `clearance` pixels around it. */
export function boxNearCircle(box: Box, centre: Point, radius: number, clearance: number): boolean {
  const dx = Math.max(box.left - centre.x, 0, centre.x - box.right);
  const dy = Math.max(box.top - centre.y, 0, centre.y - box.bottom);
  return Math.hypot(dx, dy) < radius + clearance;
}

/**
 * Whether a diamond (its corners `reach` from its middle, straight up, down and to each side)
 * reaches into a box or into the `clearance` pixels around it. The nearest point of the box is the
 * nearest along each axis, and a diamond's reach is the sum of the two distances.
 */
export function boxNearDiamond(box: Box, centre: Point, reach: number, clearance: number): boolean {
  const dx = Math.max(box.left - centre.x, 0, centre.x - box.right);
  const dy = Math.max(box.top - centre.y, 0, centre.y - box.bottom);
  return dx + dy < reach + clearance;
}

/** The straight-line distance from a point to a box, 0 when it lies inside. */
function pointToBox(q: Point, box: Box): number {
  const dx = Math.max(box.left - q.x, 0, q.x - box.right);
  const dy = Math.max(box.top - q.y, 0, q.y - box.bottom);
  return Math.hypot(dx, dy);
}

/** The straight-line distance from a point to the segment `a`–`b`. */
function pointToSegment(q: Point, a: Point, b: Point): number {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const length2 = dx * dx + dy * dy;
  // The nearest point of the segment, as a fraction of the way from `a` to `b`, kept on it.
  const t =
    length2 === 0 ? 0 : Math.min(1, Math.max(0, ((q.x - a.x) * dx + (q.y - a.y) * dy) / length2));
  return Math.hypot(a.x + t * dx - q.x, a.y + t * dy - q.y);
}

/**
 * Whether the segment `a`–`b` meets the box, edges included: it is clipped to the box one axis at
 * a time (Liang–Barsky), and meets it when a part of it is left.
 */
function segmentMeetsBox(a: Point, b: Point, box: Box): boolean {
  let [enter, leave] = [0, 1];
  const axes: [number, number, number, number][] = [
    [a.x, b.x - a.x, box.left, box.right],
    [a.y, b.y - a.y, box.top, box.bottom],
  ];
  for (const [start, delta, low, high] of axes) {
    if (delta === 0) {
      if (start < low || start > high) return false;
      continue;
    }
    const [t0, t1] = [(low - start) / delta, (high - start) / delta];
    enter = Math.max(enter, Math.min(t0, t1));
    leave = Math.min(leave, Math.max(t0, t1));
  }
  return enter <= leave;
}

/**
 * Whether the segment `a`–`b` (a vine, drawn as a stroke) comes within `reach` pixels of a box,
 * in a straight line. Apart from a box it meets, its nearest point to the box is one of its ends
 * or the foot of a corner of the box on it.
 */
export function segmentNearBox(a: Point, b: Point, box: Box, reach: number): boolean {
  // A segment whose own bounding box stays `reach` away from the box cannot come nearer: the
  // cheap answer for most vines, far from most names.
  if (
    Math.max(a.x, b.x) <= box.left - reach ||
    Math.min(a.x, b.x) >= box.right + reach ||
    Math.max(a.y, b.y) <= box.top - reach ||
    Math.min(a.y, b.y) >= box.bottom + reach
  ) {
    return false;
  }
  if (segmentMeetsBox(a, b, box)) return true;
  const corners: Point[] = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
  const distance = Math.min(
    pointToBox(a, box),
    pointToBox(b, box),
    ...corners.map((corner) => pointToSegment(corner, a, b)),
  );
  return distance < reach;
}
