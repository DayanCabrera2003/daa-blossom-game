import type { Point } from './diagramGarden';

/**
 * The outlines of the small gardens of the Codex: the convex hull of some points, and a hull
 * rounded `pad` away from them, which is how a folded flower is drawn round its petals.
 */

/** How many points of a circle stand for it in a rounded hull. */
const CIRCLE_STEPS = 16;

/** The turn from `o` through `a` to `b`: positive one way, negative the other, 0 in line. */
const cross = (o: Point, a: Point, b: Point): number =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/**
 * The convex hull of `points` (Andrew's monotone chain), its corners in turning order from the
 * leftmost; repeats and points along an edge are dropped. One or two distinct points are their own
 * hull.
 */
export function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points]
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((p, i, all) => i === 0 || p.x !== all[i - 1]?.x || p.y !== all[i - 1]?.y);
  if (sorted.length < 3) return sorted;
  const half = (list: readonly Point[]): Point[] => {
    const chain: Point[] = [];
    for (const p of list) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2] as Point, chain[chain.length - 1] as Point, p) <= 0
      ) {
        chain.pop();
      }
      chain.push(p);
    }
    return chain.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** The hull of `points` with every corner rounded `pad` away from them. */
export function roundedHull(points: readonly Point[], pad: number): Point[] {
  const ring = Array.from({ length: CIRCLE_STEPS }, (_, k) => (2 * Math.PI * k) / CIRCLE_STEPS);
  return convexHull(
    points.flatMap(({ x, y }) =>
      ring.map((angle) => ({ x: x + pad * Math.cos(angle), y: y + pad * Math.sin(angle) })),
    ),
  );
}
