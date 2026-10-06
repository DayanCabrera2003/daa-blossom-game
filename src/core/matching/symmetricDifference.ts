import { edgeKey } from '../graph/queries';
import type { Edge, VertexId } from '../graph/types';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import { UNMATCHED, type Matching } from './types';

/**
 * One connected piece of M ⊕ M′: a thread (path) or a loop (cycle) in the Mirror Pond.
 * - `vertices`: a path runs from its smaller endpoint; a cycle starts at its smallest vertex and
 *   heads to the smaller of its two neighbors, without repeating the start.
 * - `edges`: the vines in traversal order, oriented along it (a cycle includes the closing vine).
 * - `gain`: vines lit in `to` minus vines lit in `from`, i.e. what flipping this piece is worth.
 */
export interface DifferenceComponent {
  readonly kind: 'path' | 'cycle';
  readonly vertices: readonly VertexId[];
  readonly edges: readonly Edge[];
  readonly gain: number;
}

/** Vines lit in exactly one of the two matchings, normalized and sorted. */
export function symmetricDifference(from: Matching, to: Matching): Edge[] {
  const edges = new Map<string, Edge>();
  for (const matching of [from, to]) {
    matching.mate.forEach((partner, v) => {
      if (partner === UNMATCHED || v > partner) return;
      const other = matching === from ? to : from;
      if (other.mate[v] !== partner) edges.set(edgeKey(v, partner), [v, partner]);
    });
  }
  return [...edges.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

/**
 * Decomposes M ⊕ M′ into alternating paths and cycles (the proof of Berge's lemma, Códex C3).
 *
 * Each vertex keeps at most one lantern in each matching, so it has at most one `from` vine and one
 * `to` vine in the difference: degree ≤ 2. A graph of maximum degree 2 is a disjoint union of paths
 * and cycles, and along each piece the vines alternate between the two matchings. Hence a cycle is
 * even and ties, and a path is worth −1, 0 or +1.
 */
export function decomposeSymmetricDifference(from: Matching, to: Matching): DifferenceComponent[] {
  invariant(from.mate.length === to.mate.length, 'matchings must belong to the same graph');
  const n = from.mate.length;

  // Partner of v in the difference through each matching, or UNMATCHED if that vine is shared.
  const partnerIn = (matching: Matching, other: Matching, v: VertexId): VertexId => {
    const partner = itemAt(matching.mate, v);
    return partner !== UNMATCHED && other.mate[v] !== partner ? partner : UNMATCHED;
  };
  const neighborsOf = (v: VertexId): VertexId[] =>
    [partnerIn(from, to, v), partnerIn(to, from, v)].filter((w) => w !== UNMATCHED);

  const visited = new Array<boolean>(n).fill(false);
  const components: DifferenceComponent[] = [];

  /**
   * Walks one component from `start`. The first step goes to the smaller neighbor (the only one
   * for a path endpoint; the canonical direction for a cycle); afterwards there is at most one
   * unvisited neighbor, and the walk stops when none is left (path end, or cycle closed).
   */
  const walk = (start: VertexId, kind: DifferenceComponent['kind']): void => {
    const vertices: VertexId[] = [start];
    visited[start] = true;
    let current: VertexId | undefined = Math.min(...neighborsOf(start));
    while (current !== undefined && !visited[current]) {
      visited[current] = true;
      vertices.push(current);
      current = neighborsOf(current).find((w) => !visited[w]);
    }
    components.push(describe(vertices, kind, from, to));
  };

  // Paths first, from their smaller endpoint (degree-1 vertices, scanned in ascending order).
  for (let v = 0; v < n; v++) if (!visited[v] && neighborsOf(v).length === 1) walk(v, 'path');
  // Every remaining vertex of the difference has degree 2 and lies on a cycle.
  for (let v = 0; v < n; v++) if (!visited[v] && neighborsOf(v).length === 2) walk(v, 'cycle');

  return components.sort((a, b) => Math.min(...a.vertices) - Math.min(...b.vertices));
}

/** Builds the component record: its oriented vines and what flipping it is worth. */
function describe(
  vertices: readonly VertexId[],
  kind: DifferenceComponent['kind'],
  from: Matching,
  to: Matching,
): DifferenceComponent {
  const edges: Edge[] = [];
  for (let i = 0; i + 1 < vertices.length; i++) {
    edges.push([itemAt(vertices, i), itemAt(vertices, i + 1)]);
  }
  if (kind === 'cycle') edges.push([itemAt(vertices, vertices.length - 1), itemAt(vertices, 0)]);

  const gain = edges.reduce(
    (sum, [u, v]) => sum + (to.mate[u] === v ? 1 : 0) - (from.mate[u] === v ? 1 : 0),
    0,
  );
  return { kind, vertices, edges, gain };
}
