import { neighbors } from '../graph/queries';
import type { VertexId } from '../graph/types';
import { isMatchedEdge } from '../matching/queries';
import { baseVertex, members } from './hierarchy';
import type { GardenNode, Layer, OrientedEdge } from './types';

/**
 * The original vine that joins folded nodes `a` and `b`, oriented from `a`. If they share a
 * lantern it is that lantern, which necessarily joins their two base sprouts (a base is the only
 * sprout whose lantern leaves its node). Otherwise any vine between them is dark; the smallest is
 * taken so folding is deterministic.
 */
export function vineBetween(layer: Layer, a: VertexId, b: VertexId): OrientedEdge {
  const nodeA = layer.nodes[a] as GardenNode;
  const nodeB = layer.nodes[b] as GardenNode;
  if (isMatchedEdge(layer.matching, a, b)) return [baseVertex(nodeA), baseVertex(nodeB)];
  for (const u of members(nodeA)) {
    for (const v of neighbors(layer.original, u)) if (layer.nodeOf[v] === b) return [u, v];
  }
  throw new Error(`no vine joins nodes ${a} and ${b}`);
}
