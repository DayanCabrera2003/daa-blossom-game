import { neighbors } from '../graph/queries';
import type { VertexId } from '../graph/types';
import { isMatchedEdge } from '../matching/queries';
import { UNMATCHED } from '../matching/types';
import { itemAt } from '../shared/itemAt';
import { baseVertex, members } from './hierarchy';
import type { GardenNode, Layer, OrientedEdge } from './types';

/**
 * The original vine that joins folded nodes `a` and `b`, oriented from `a`. If they share a
 * lantern it is that lantern, which necessarily joins their two base sprouts (a base is the only
 * sprout whose lantern leaves its node). Otherwise any vine between them is dark; the smallest is
 * taken so folding is deterministic.
 */
export function vineBetween(layer: Layer, a: VertexId, b: VertexId): OrientedEdge {
  const nodeA = itemAt(layer.nodes, a);
  const nodeB = itemAt(layer.nodes, b);
  if (isMatchedEdge(layer.matching, a, b)) return [baseVertex(nodeA), baseVertex(nodeB)];
  for (const u of members(nodeA)) {
    for (const v of neighbors(layer.original, u)) if (layer.nodeOf[v] === b) return [u, v];
  }
  throw new Error(`no vine joins nodes ${a} and ${b}`);
}

/**
 * Every `vineBetween(layer, a, b)` at once, keyed by the neighbor `b`: the same vines, found with a
 * single pass over the vines of `a`'s sprouts instead of one pass per neighbor. The search builds it
 * when it takes a sun from its queue, so naming the original vine of each examination costs O(1)
 * amortised: O(d(u)) for a sprout u, and O(n + m) for a flower, once per fold that made it.
 *
 * The sprouts are visited in any order, keeping for each neighbor the vine with the smallest sprout
 * of `a`; within one sprout the neighbors come in ascending order, so the first one found is the
 * smallest. That is exactly the vine `vineBetween` takes, without sorting the sprouts.
 */
export function vinesFrom(layer: Layer, a: VertexId): ReadonlyMap<VertexId, OrientedEdge> {
  const nodeA = itemAt(layer.nodes, a);
  const vines = new Map<VertexId, OrientedEdge>();
  const visit = (node: GardenNode): void => {
    if (node.kind === 'blossom') {
      for (const child of node.cycle) visit(child);
      return;
    }
    const u = node.vertex;
    for (const v of neighbors(layer.original, u)) {
      const b = itemAt(layer.nodeOf, v);
      const kept = vines.get(b);
      if (b !== a && (kept === undefined || u < kept[0])) vines.set(b, [u, v]);
    }
  };
  visit(nodeA);

  const partner = itemAt(layer.matching.mate, a);
  if (partner !== UNMATCHED) {
    vines.set(partner, [baseVertex(nodeA), baseVertex(itemAt(layer.nodes, partner))]);
  }
  return vines;
}
