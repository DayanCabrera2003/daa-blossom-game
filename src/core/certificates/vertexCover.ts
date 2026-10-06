import { bipartition } from '../graph/bipartition';
import type { Edge, Graph, VertexId } from '../graph/types';
import { invariant } from '../shared/invariant';
import { err, ok, type Result } from '../shared/result';
import type { AlternatingForest } from '../search/forest';

/** Why a set of scarecrows does not guard the garden. Indices point into the given list. */
export type CoverError =
  | { readonly code: 'vertexOutOfRange'; readonly index: number; readonly vertex: number }
  | { readonly code: 'repeatedVertex'; readonly index: number; readonly vertex: VertexId }
  | { readonly code: 'uncoveredEdge'; readonly edge: Edge };

/**
 * A vertex cover: scarecrows such that every vine touches at least one of them. Each lantern sits
 * on a guarded vine and a scarecrow guards at most one lantern (exclusivity), so any cover is at
 * least as large as any matching: ν ≤ τ, a short proof that no more lanterns fit (Códex C5).
 * On success returns the cover as given; on failure, the first offending entry or vine.
 */
export function checkVertexCover(
  graph: Graph,
  cover: readonly VertexId[],
): Result<readonly VertexId[], CoverError> {
  const guarded = new Set<VertexId>();
  for (const [index, vertex] of cover.entries()) {
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= graph.n) {
      return err({ code: 'vertexOutOfRange', index, vertex });
    }
    if (guarded.has(vertex)) return err({ code: 'repeatedVertex', index, vertex });
    guarded.add(vertex);
  }
  const uncovered = graph.edges.find(([u, v]) => !guarded.has(u) && !guarded.has(v));
  return uncovered === undefined ? ok(cover) : err({ code: 'uncoveredEdge', edge: uncovered });
}

/**
 * König's cover (1931) read off the final forest of a failed bipartite search: every moon, plus the
 * sprouts the search never reached that lie on side 0 of the bipartition. Sorted ascending.
 *
 * Why it covers: a vine at a sun leads to a moon (a sun–unreached vine would have grown the forest,
 * and sun–sun vines cannot exist in bees and flowers once the search fails). Any other vine touches
 * a moon or joins two unreached sprouts, which lie on opposite sides, so one of them is on side 0.
 * Why its size is |M|: every moon is lit, its lantern going to its child sun; unreached sprouts are
 * lit too (all dark ones are roots) and pair up among themselves, one per pair on side 0. These
 * lanterns are all distinct, so |cover| = |M| and, with ν ≤ τ, both are optimal.
 */
export function koenigCover(graph: Graph, forest: AlternatingForest): VertexId[] {
  const sides = bipartition(graph);
  invariant(sides.kind === 'bipartite', 'König covers only exist for bipartite graphs');
  const cover: VertexId[] = [];
  forest.label.forEach((label, v) => {
    if (label === 'inner' || (label === 'none' && sides.side[v] === 0)) cover.push(v);
  });
  return cover;
}
