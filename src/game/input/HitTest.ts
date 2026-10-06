import { members } from '@core/blossom/hierarchy';
import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import { flowerOutline, insidePolygon } from './flowerShape';
import type { Point, Target } from './target';

/** How far from a sprout's centre a touch still lands on it (its circle has radius 8). */
export const SPROUT_HIT_RADIUS = 10;
/** How far from a vine's line a touch still lands on it. */
export const VINE_HIT_DISTANCE = 4;
/** The margin of a flower's outline around its petals. */
export const FLOWER_PADDING = 12;

/** Distance from a point to the segment a–b. */
const toSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/**
 * What a touch at `point` lands on. Sprouts come first (a petal wins over its flower, so marks can
 * still be put on petals), then vines, then the flowers on top. A vine joining two petals of one
 * folded flower is part of that flower and cannot be touched on its own. Only the outermost
 * flowers are offered: nested flowers open from the outside in (5.2).
 */
export function hitTest(state: GardenState, positions: readonly Point[], point: Point): Target {
  const at = (v: VertexId): Point => itemAt(positions, v);
  const distanceTo = (v: VertexId): number => Math.hypot(point.x - at(v).x, point.y - at(v).y);

  const sprouts = positions.map((_, v) => v).filter((v) => distanceTo(v) <= SPROUT_HIT_RADIUS);
  if (sprouts.length > 0) {
    const nearest = sprouts.reduce((best, v) => (distanceTo(v) < distanceTo(best) ? v : best));
    return { kind: 'sprout', vertex: nearest };
  }

  const { nodeOf, nodes } = state.layer;
  let vine: { u: VertexId; v: VertexId; distance: number } | null = null;
  for (const [u, v] of state.graph.edges) {
    if (nodeOf[u] === nodeOf[v]) continue;
    const distance = toSegment(point, at(u), at(v));
    if (distance <= VINE_HIT_DISTANCE && (vine === null || distance < vine.distance)) {
      vine = { u, v, distance };
    }
  }
  if (vine !== null) return { kind: 'vine', u: vine.u, v: vine.v };

  for (const node of nodes) {
    if (node.kind !== 'blossom') continue;
    const outline = flowerOutline(members(node).map(at), FLOWER_PADDING);
    if (insidePolygon(point, outline)) return { kind: 'flower', blossom: node.id };
  }
  return { kind: 'nothing' };
}
