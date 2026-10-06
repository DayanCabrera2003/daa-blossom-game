import { createGraph } from '../graph/createGraph';
import type { Edge, Graph } from '../graph/types';
import { invariant } from '../shared/invariant';
import { unwrap } from '../shared/result';

/**
 * Classic graph families with well-known matching numbers. They anchor the brute-force oracle's
 * tests (a path or cycle on n sprouts lights ⌊n/2⌋ lanterns) and feed the races and the sandbox.
 * Sizes are code, not player input, so an invalid size is a bug and throws.
 */

const assertSize = (size: number, min: number): void => {
  invariant(Number.isInteger(size) && size >= min, `family size must be an integer ≥ ${min}`);
};

/** The path 0–1–…–(n-1). */
export function pathGraph(n: number): Graph {
  assertSize(n, 0);
  const edges: Edge[] = [];
  for (let v = 0; v + 1 < n; v++) edges.push([v, v + 1]);
  return unwrap(createGraph(n, edges));
}

/** The cycle 0–1–…–(n-1)–0; below three sprouts it would need a loop or a parallel vine. */
export function cycleGraph(n: number): Graph {
  assertSize(n, 3);
  const edges: Edge[] = [];
  for (let v = 0; v < n; v++) edges.push([v, (v + 1) % n]);
  return unwrap(createGraph(n, edges));
}

/** A star: center 0 joined to each of the leaves 1..leaves. Only one lantern can ever be lit. */
export function starGraph(leaves: number): Graph {
  assertSize(leaves, 0);
  const edges: Edge[] = [];
  for (let leaf = 1; leaf <= leaves; leaf++) edges.push([0, leaf]);
  return unwrap(createGraph(leaves + 1, edges));
}

/** The complete graph K_n: every pair of sprouts shares a vine. */
export function completeGraph(n: number): Graph {
  assertSize(n, 0);
  const edges: Edge[] = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) edges.push([u, v]);
  return unwrap(createGraph(n, edges));
}
