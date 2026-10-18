import type { Edge, VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import type { Point } from './diagramGarden';

/**
 * What a special diagram of the Codex marks on a small garden besides the garden itself (plan 07,
 * phase 5): strands along vines (the lanterns of one side of the pond, the vines a scarecrow
 * guards, the stretch of a chain), groups of sprouts wrapped together (the threads and loops of the
 * pond, the groups the stones leave), rings round single sprouts (a chain's ends, a flower's base).
 * Everything is placed in the picture's own pixels, from where `fitGarden` set the sprouts; the
 * tones are classes of `diagram.css`, which hold the colours.
 */

/** What a strand along a vine stands for. */
export type StrandTone = 'yours' | 'mirror' | 'guarded' | 'chain' | 'stretch';

/** A strand drawn along a vine, maybe shifted sideways so that two fit on one vine. */
export interface OverlayStrand {
  readonly a: Point;
  readonly b: Point;
  readonly tone: StrandTone;
}

/** What a group of sprouts stands for. */
export type GroupTone = 'gain' | 'tie' | 'loss' | 'odd' | 'even' | 'chosen' | 'inner';

/** Sprouts wrapped together with the vines that join them inside the group, and a short label. */
export interface OverlayGroup {
  readonly tone: GroupTone;
  readonly sprouts: readonly Point[];
  readonly links: readonly (readonly [Point, Point])[];
  /** A number or sign shown on the group (`+1`, `3`), or null; never words, which need a text. */
  readonly label: string | null;
  /** Where the label sits: the middle of the group's sprouts. */
  readonly labelAt: Point;
}

/** What a ring round a sprout stands for. */
export type RingTone = 'end' | 'petal' | 'base';

/** A ring round one sprout. */
export interface OverlayRing {
  readonly at: Point;
  readonly tone: RingTone;
}

/** Everything a special diagram marks on its garden at one moment. */
export interface Overlay {
  readonly strands: readonly OverlayStrand[];
  readonly groups: readonly OverlayGroup[];
  readonly rings: readonly OverlayRing[];
}

/** Nothing marked. */
export const NO_OVERLAY: Overlay = { strands: [], groups: [], rings: [] };

/** How far apart two strands on one vine are drawn, in pixels of the picture. */
export const STRAND_GAP = 4;

/**
 * The strand along the vine `u–v` of the sprouts placed at `at`, shifted `shift` pixels to its
 * left as walked from the smaller sprout (0 on the vine itself), so both sides of the pond can lay
 * their strands on one vine without hiding each other.
 */
export function strandOf(
  at: readonly Point[],
  [u, v]: Edge,
  tone: StrandTone,
  shift = 0,
): OverlayStrand {
  const [from, to] = u < v ? [itemAt(at, u), itemAt(at, v)] : [itemAt(at, v), itemAt(at, u)];
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const nx = (-(to.y - from.y) / length) * shift;
  const ny = ((to.x - from.x) / length) * shift;
  return {
    a: { x: from.x + nx, y: from.y + ny },
    b: { x: to.x + nx, y: to.y + ny },
    tone,
  };
}

/**
 * The group of `sprouts` placed at `at`, wrapped with the vines of `edges` that join two of them,
 * with its label at the middle of its sprouts.
 */
export function groupOf(
  at: readonly Point[],
  sprouts: readonly VertexId[],
  edges: readonly Edge[],
  tone: GroupTone,
  label: string | null = null,
): OverlayGroup {
  const inside = new Set(sprouts);
  const points = sprouts.map((v) => itemAt(at, v));
  return {
    tone,
    sprouts: points,
    links: edges
      .filter(([u, v]) => inside.has(u) && inside.has(v))
      .map(([u, v]): [Point, Point] => [itemAt(at, u), itemAt(at, v)]),
    label,
    labelAt: {
      x: points.reduce((sum, p) => sum + p.x, 0) / Math.max(1, points.length),
      y: points.reduce((sum, p) => sum + p.y, 0) / Math.max(1, points.length),
    },
  };
}

/** The ring of `tone` round the sprout `v` placed at `at`. */
export const ringOf = (at: readonly Point[], v: VertexId, tone: RingTone): OverlayRing => ({
  at: itemAt(at, v),
  tone,
});
