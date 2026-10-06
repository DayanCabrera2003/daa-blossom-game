import { itemAt } from '@core/shared/itemAt';
import type { Point } from './target';

const cross = (o: Point, a: Point, b: Point): number =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

const centroid = (points: readonly Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

/** The convex hull of some points, counter-clockwise (Andrew's monotone chain). */
export function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const half = (list: Point[]): Point[] => {
    const chain: Point[] = [];
    for (const p of list) {
      while (
        chain.length >= 2 &&
        cross(itemAt(chain, chain.length - 2), itemAt(chain, chain.length - 1), p) <= 0
      ) {
        chain.pop();
      }
      chain.push(p);
    }
    return chain.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * The outline of a folded flower drawn around its petals: their hull pushed outwards from its
 * centre by `padding`. Pushing each corner along the ray from the centre keeps every petal inside.
 * Petals in a line (or on one spot) have no area, so they get an octagon around their centre.
 * `HitTest` and the flower view share this shape, so what is drawn is what can be touched.
 */
export function flowerOutline(petals: readonly Point[], padding: number): Point[] {
  const hull = convexHull(petals);
  const centre = centroid(petals);
  if (hull.length < 3) {
    const radius =
      Math.max(0, ...petals.map((p) => Math.hypot(p.x - centre.x, p.y - centre.y))) + padding;
    return Array.from({ length: 8 }, (_, k) => ({
      x: centre.x + radius * Math.cos((k * Math.PI) / 4),
      y: centre.y + radius * Math.sin((k * Math.PI) / 4),
    }));
  }
  const middle = centroid(hull);
  return hull.map((corner) => {
    const length = Math.hypot(corner.x - middle.x, corner.y - middle.y);
    return {
      x: corner.x + ((corner.x - middle.x) / length) * padding,
      y: corner.y + ((corner.y - middle.y) / length) * padding,
    };
  });
}

/** Whether a point lies inside a polygon (ray casting). */
export function insidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = itemAt(polygon, i);
    const b = itemAt(polygon, j);
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Points inside a polygon worth touching, best first: its centre, then points between the centre
 * and each corner. The view and the tests pick the first one that is not on a sprout or a vine.
 */
export function interiorCandidates(polygon: readonly Point[]): Point[] {
  const centre = centroid(polygon);
  const around = polygon.flatMap((corner) =>
    [0.25, 0.5, 0.75].map((t) => ({
      x: centre.x + t * (corner.x - centre.x),
      y: centre.y + t * (corner.y - centre.y),
    })),
  );
  return [centre, ...around].filter((point) => insidePolygon(point, polygon));
}
