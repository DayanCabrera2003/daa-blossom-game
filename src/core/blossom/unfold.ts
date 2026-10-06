import { createGraph } from '../graph/createGraph';
import type { Edge, VertexId } from '../graph/types';
import { UNMATCHED } from '../matching/types';
import { invariant } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { baseVertex, members } from './hierarchy';
import type { GardenNode, Layer } from './types';

/**
 * Opens one folded flower of the garden, the exact inverse of `contract` (levels 4.5, 5.2): its
 * children come back as nodes of the garden, one level of folding at a time.
 *
 * Folded gardens keep their nodes sorted by base sprout (`openLayer` starts that way and `contract`
 * puts a flower where its base was), so sorting again after the children come back restores the
 * ids `contract` started from. The lanterns come back from the flower's own structure: the lit
 * pairs of its loop are (1,2), (3,4), …, and the base child keeps the lantern of the whole flower.
 */
export function unfoldLayer(layer: Layer, blossom: VertexId): Layer {
  const flower = layer.nodes[blossom];
  invariant(flower?.kind === 'blossom', `node ${blossom} is not a flower`);

  const nodes: GardenNode[] = [
    ...layer.nodes.filter((_, id) => id !== blossom),
    ...flower.cycle,
  ].sort((a, b) => baseVertex(a) - baseVertex(b));
  const idOf = new Map(nodes.map((node, id) => [baseVertex(node), id]));
  const renamed = (node: GardenNode): VertexId => idOf.get(baseVertex(node)) as VertexId;

  const nodeOf = new Array<VertexId>(layer.original.n);
  nodes.forEach((node, id) => {
    for (const v of members(node)) nodeOf[v] = id;
  });

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const [u, v] of layer.original.edges) {
    const [a, b] = [nodeOf[u] as VertexId, nodeOf[v] as VertexId];
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || seen.has(key)) continue;
    seen.add(key);
    edges.push([a, b]);
  }

  const mate = new Array<VertexId>(nodes.length).fill(UNMATCHED);
  const pair = (a: VertexId, b: VertexId): void => {
    mate[a] = b;
    mate[b] = a;
  };
  layer.matching.mate.forEach((partner, id) => {
    if (partner === UNMATCHED || id === blossom || partner === blossom) return;
    pair(renamed(layer.nodes[id] as GardenNode), renamed(layer.nodes[partner] as GardenNode));
  });
  const outside = layer.matching.mate[blossom] as VertexId;
  if (outside !== UNMATCHED) {
    pair(renamed(flower.cycle[0] as GardenNode), renamed(layer.nodes[outside] as GardenNode));
  }
  for (let i = 1; i < flower.cycle.length; i += 2) {
    pair(renamed(flower.cycle[i] as GardenNode), renamed(flower.cycle[i + 1] as GardenNode));
  }

  return {
    original: layer.original,
    graph: unwrap(createGraph(nodes.length, edges)),
    matching: { mate },
    nodes,
    nodeOf,
  };
}
