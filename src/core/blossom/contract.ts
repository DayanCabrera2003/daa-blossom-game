import { createGraph } from '../graph/createGraph';
import type { Edge, Graph, VertexId } from '../graph/types';
import { UNMATCHED, type Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { checkBlossom } from './isBlossom';
import type { Blossom, GardenNode, Layer } from './types';
import { vineBetween } from './vineBetween';

/** The garden with nothing folded: every sprout is its own node. */
export function openLayer(graph: Graph, matching: Matching): Layer {
  return {
    original: graph,
    graph,
    matching,
    nodes: Array.from({ length: graph.n }, (_, vertex) => ({ kind: 'sprout', vertex })),
    nodeOf: Array.from({ length: graph.n }, (_, vertex) => vertex),
  };
}

/** Highest flower id anywhere in the garden, or −1 if nothing is folded. */
const maxBlossomId = (nodes: readonly GardenNode[]): number =>
  nodes.reduce(
    (max, node) =>
      node.kind === 'blossom' ? Math.max(max, node.id, maxBlossomId(node.cycle)) : max,
    -1,
  );

/**
 * Folds a flower of the current garden into a single node: G/B and M/B (Códex C7). The loop is
 * given in folded ids, from any sprout and in either direction; it must be a flower (a bug
 * otherwise, since callers pass loops from `findOddCycle` or from `checkBlossom`).
 *
 * The new node takes the place of the base and the other ids close up, keeping their order. It
 * inherits every vine leaving the loop, and the lantern of the base, which is the only lantern
 * leaving it: k lanterns disappear inside, so |M/B| = |M| − k.
 *
 * Returns the folded garden and the id of the new node in it.
 */
export function contract(
  layer: Layer,
  loop: readonly VertexId[],
): { layer: Layer; blossom: VertexId } {
  const checked = checkBlossom(layer.graph, layer.matching, loop);
  invariant(checked.ok, `cannot fold a loop that is not a flower: ${loop.join(', ')}`);
  const cycle = checked.value;
  const base = cycle[0] as VertexId;
  const inLoop = new Set(cycle);

  const blossom: Blossom = {
    kind: 'blossom',
    id: maxBlossomId(layer.nodes) + 1,
    cycle: cycle.map((id) => layer.nodes[id] as GardenNode),
    edges: cycle.map((id, i) => vineBetween(layer, id, cycle[(i + 1) % cycle.length] as VertexId)),
  };

  // Renumber: the flower sits where the base was; every other loop member disappears.
  const renamed: VertexId[] = [];
  const nodes: GardenNode[] = [];
  layer.nodes.forEach((node, id) => {
    if (inLoop.has(id) && id !== base) return;
    renamed[id] = nodes.length;
    nodes.push(id === base ? blossom : node);
  });
  const blossomId = renamed[base] as VertexId;
  const rename = (id: VertexId): VertexId =>
    inLoop.has(id) ? blossomId : (renamed[id] as VertexId);

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const [u, v] of layer.graph.edges) {
    const [a, b] = [rename(u), rename(v)];
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || seen.has(key)) continue;
    seen.add(key);
    edges.push([a, b]);
  }

  const mate = new Array<VertexId>(nodes.length).fill(UNMATCHED);
  layer.matching.mate.forEach((partner, id) => {
    if (partner === UNMATCHED || (inLoop.has(id) && inLoop.has(partner))) return;
    mate[rename(id)] = rename(partner);
  });

  return {
    layer: {
      original: layer.original,
      graph: unwrap(createGraph(nodes.length, edges)),
      matching: { mate },
      nodes,
      nodeOf: layer.nodeOf.map(rename),
    },
    blossom: blossomId,
  };
}
