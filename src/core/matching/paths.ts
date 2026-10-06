import { hasEdge } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { err, ok, type Result } from '../shared/result';
import { isExposed, isMatchedEdge } from './queries';
import type { Matching } from './types';

/**
 * Why a sequence of sprouts is not the kind of path asked for. Indices point into the path so the
 * game can highlight the exact vine or sprout that breaks the rule (gentle feedback, not failure).
 * For `notAdjacent` and `notAlternating`, `index` is the vine between path[index] and path[index+1].
 */
export type PathError =
  | { readonly code: 'empty' }
  | { readonly code: 'vertexOutOfRange'; readonly index: number; readonly vertex: number }
  | { readonly code: 'repeatedVertex'; readonly index: number; readonly vertex: VertexId }
  | { readonly code: 'notAdjacent'; readonly index: number }
  | { readonly code: 'notAlternating'; readonly index: number }
  | { readonly code: 'tooShort' }
  | { readonly code: 'endpointNotExposed'; readonly vertex: VertexId }
  | { readonly code: 'wrongParity'; readonly edges: number };

/** A validated alternating path. `firstEdgeMatched` is null when the path has no vines. */
export interface AlternatingPath {
  readonly vertices: readonly VertexId[];
  readonly firstEdgeMatched: boolean | null;
}

/**
 * A simple path whose vines alternate between dark and lit (unmatched and matched edges). This is
 * the shape along which lanterns can be passed without breaking exclusivity (Códex C2).
 */
export function checkAlternatingPath(
  graph: Graph,
  matching: Matching,
  path: readonly VertexId[],
): Result<AlternatingPath, PathError> {
  if (path.length === 0) return err({ code: 'empty' });

  const seen = new Set<VertexId>();
  for (const [index, vertex] of path.entries()) {
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= graph.n) {
      return err({ code: 'vertexOutOfRange', index, vertex });
    }
    if (seen.has(vertex)) return err({ code: 'repeatedVertex', index, vertex });
    seen.add(vertex);
  }

  let firstEdgeMatched: boolean | null = null;
  let previousMatched: boolean | null = null;
  for (let index = 0; index + 1 < path.length; index++) {
    const u = path[index] as VertexId;
    const v = path[index + 1] as VertexId;
    if (!hasEdge(graph, u, v)) return err({ code: 'notAdjacent', index });
    const matched = isMatchedEdge(matching, u, v);
    if (matched === previousMatched) return err({ code: 'notAlternating', index });
    firstEdgeMatched ??= matched;
    previousMatched = matched;
  }

  return ok({ vertices: path, firstEdgeMatched });
}

/**
 * An augmenting path (a winning chain): alternating, at least one vine, both ends in the dark.
 * With both ends exposed, the first and last vines are necessarily dark and the length is odd,
 * so flipping it lights one more lantern than before (Códex C2).
 */
export function checkAugmentingPath(
  graph: Graph,
  matching: Matching,
  path: readonly VertexId[],
): Result<AlternatingPath, PathError> {
  const alternating = checkAlternatingPath(graph, matching, path);
  if (!alternating.ok) return alternating;
  if (path.length < 2) return err({ code: 'tooShort' });
  for (const vertex of [path[0], path[path.length - 1]] as VertexId[]) {
    if (!isExposed(matching, vertex)) return err({ code: 'endpointNotExposed', vertex });
  }
  return alternating;
}

/**
 * A stem: an even alternating path from a sprout in the dark (the root) to a blossom's base.
 * Starting exposed forces the first vine to be dark, so even length means it ends on a lantern.
 * Flipping a stem keeps |M| and moves the darkness from the root to the base (level 4.10).
 */
export function checkStem(
  graph: Graph,
  matching: Matching,
  path: readonly VertexId[],
): Result<AlternatingPath, PathError> {
  const alternating = checkAlternatingPath(graph, matching, path);
  if (!alternating.ok) return alternating;
  const root = path[0] as VertexId;
  if (!isExposed(matching, root)) return err({ code: 'endpointNotExposed', vertex: root });
  const edges = path.length - 1;
  if (edges % 2 !== 0) return err({ code: 'wrongParity', edges });
  return alternating;
}
