import type { Graph, VertexId } from '../graph/types';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import { err, ok, type Result } from '../shared/result';
import { oddComponents } from './oddComponents';

/** Why a set of stones does not prove a matching maximum. Indices point into the given stones. */
export type TutteBergeError =
  | { readonly code: 'vertexOutOfRange'; readonly index: number; readonly vertex: number }
  | { readonly code: 'repeatedVertex'; readonly index: number; readonly vertex: VertexId }
  | { readonly code: 'notTight'; readonly bound: number; readonly size: number };

/** A certificate that closes: the bound it proves and the odd groups behind it. */
export interface TutteBergeProof {
  readonly bound: number;
  readonly oddGroups: readonly (readonly VertexId[])[];
}

/**
 * The Tutte–Berge bound for stones U (Códex C12): ν(G) ≤ (n + |U| − odd(G − U)) / 2.
 * Each odd group leaves at least one sprout that is dark or lit by a stone, and each stone lights
 * at most one of them, so at least odd(G − U) − |U| sprouts sleep in the dark (level 7.3).
 * The numerator is always even: n − |U| sprouts remain, and their parity is that of the odd count.
 */
export function tutteBergeBound(graph: Graph, stones: readonly VertexId[]): number {
  return (graph.n + stones.length - oddComponents(graph, stones).length) / 2;
}

/**
 * Checks a certificate of optimality: valid stones whose bound equals the number of lanterns. When
 * it closes, no matching can be larger, without trying a single alternative (the Council's proof).
 */
export function checkTutteBerge(
  graph: Graph,
  matching: Matching,
  stones: readonly VertexId[],
): Result<TutteBergeProof, TutteBergeError> {
  const seen = new Set<VertexId>();
  for (const [index, vertex] of stones.entries()) {
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= graph.n) {
      return err({ code: 'vertexOutOfRange', index, vertex });
    }
    if (seen.has(vertex)) return err({ code: 'repeatedVertex', index, vertex });
    seen.add(vertex);
  }
  const oddGroups = oddComponents(graph, stones);
  const bound = (graph.n + stones.length - oddGroups.length) / 2;
  const lit = size(matching);
  return bound === lit ? ok({ bound, oddGroups }) : err({ code: 'notTight', bound, size: lit });
}
