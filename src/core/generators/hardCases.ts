import { createGraph } from '../graph/createGraph';
import type { Edge, Graph, VertexId } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import { unwrap } from '../shared/result';

/** A garden with the lanterns that make its structure appear in a search. */
export interface HardCase {
  readonly graph: Graph;
  readonly matching: Matching;
}

/**
 * Gardens built to stress folding (plan 01, phase 11). Each has a single sprout in the dark, R = 0,
 * and no chain: a search can only finish by folding its flowers and proving that nothing is left.
 * With more roots, a chain could go round a flower without folding it (as in 4.1 and 4.6 with the
 * full forest), which would hide exactly what these cases are for.
 */

const assertCount = (value: number, min: number, what: string): void => {
  invariant(Number.isInteger(value) && value >= min, `${what} must be an integer ≥ ${min}`);
};

const build = (n: number, edges: readonly Edge[], lit: readonly Edge[]): HardCase => {
  const graph = unwrap(createGraph(n, edges));
  return { graph, matching: unwrap(createMatching(graph, lit)) };
};

/** The stem R–s1=t1–…–sL=tL as edges and lit pairs; t_i = 2i is a sun at the end of each step. */
const stem = (length: number): { edges: Edge[]; lit: Edge[] } => {
  const edges: Edge[] = [];
  const lit: Edge[] = [];
  for (let i = 1; i <= length; i++) {
    edges.push([2 * i - 2, 2 * i - 1], [2 * i - 1, 2 * i]);
    lit.push([2 * i - 1, 2 * i]);
  }
  return { edges, lit };
};

/**
 * A triangle t–p=q–t hanging at the end of a stem of `length` lit pairs (level 4.7): the search
 * walks the whole stem before it meets the flower, whose base is the last sun of the stem.
 */
export function longStemFlower(length: number): HardCase {
  assertCount(length, 0, 'stem length');
  const { edges, lit } = stem(length);
  const base = 2 * length;
  const [p, q] = [base + 1, base + 2];
  return build(base + 3, [...edges, [base, p], [p, q], [q, base]], [...lit, [p, q]]);
}

/**
 * Flowers folded inside each other k + 1 times, generalizing level 5.1. A stem of k lit pairs ends
 * in a triangle (the innermost flower). Then, for each level i, a lit pair g=h joins a moon of the
 * previous flower (g) to the sun one step further up the stem (h). A moon cannot close a loop
 * until its flower is folded, so each loop has to go through the previous flower and fold around
 * it. R ends as the base of the outermost flower.
 */
export function nestedFlowers(k: number): HardCase {
  assertCount(k, 1, 'nesting depth');
  const { edges, lit } = stem(k);
  const top = 2 * k;
  const [c, d] = [top + 1, top + 2];
  edges.push([top, c], [c, d], [d, top]);
  lit.push([c, d]);
  // The moon of the latest flower: c in the triangle, then the h of each new level.
  let moon: VertexId = c;
  for (let i = 1; i <= k; i++) {
    const [g, h] = [top + 1 + 2 * i, top + 2 + 2 * i];
    edges.push([moon, g], [g, h], [h, 2 * (k - i)]);
    lit.push([g, h]);
    moon = h;
  }
  return build(4 * k + 3, edges, lit);
}

/**
 * The helix of level 7.3 with any number of arms: a center C = 0 joined to one sprout of each of
 * `arms` triangles. C shares a lantern with the first arm, every other triangle holds one inside.
 * It lights arms + 1 lanterns, and lifting C alone proves it.
 */
export function helix(arms: number): HardCase {
  assertCount(arms, 1, 'number of arms');
  const edges: Edge[] = [];
  const lit: Edge[] = [];
  for (let j = 0; j < arms; j++) {
    const [a, b, c] = [1 + 3 * j, 2 + 3 * j, 3 + 3 * j];
    edges.push([0, a], [a, b], [b, c], [c, a]);
    lit.push(j === 0 ? [0, a] : [a, b]);
  }
  lit.push([2, 3]);
  return build(1 + 3 * arms, edges, lit);
}

/**
 * Several closed flowers on separate branches of one root (level 4.8): R–a=b with a triangle
 * b–c=d–b on every branch, so one search folds `count` flowers and never finds a chain.
 */
export function manyFlowers(count: number): HardCase {
  assertCount(count, 1, 'number of flowers');
  const edges: Edge[] = [];
  const lit: Edge[] = [];
  for (let j = 0; j < count; j++) {
    const [a, b, c, d] = [1 + 4 * j, 2 + 4 * j, 3 + 4 * j, 4 + 4 * j];
    edges.push([0, a], [a, b], [b, c], [c, d], [d, b]);
    lit.push([a, b], [c, d]);
  }
  return build(1 + 4 * count, edges, lit);
}
