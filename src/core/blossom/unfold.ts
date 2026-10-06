import type { VertexId } from '../graph/types';
import { UNMATCHED } from '../matching/types';
import { invariant } from '../shared/invariant';
import { baseVertex, members } from './hierarchy';
import { projectGraph } from './projectGraph';
import type { GardenNode, Layer } from './types';
import { itemAt } from '../shared/itemAt';

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

  const mate = new Array<VertexId>(nodes.length).fill(UNMATCHED);
  const pair = (a: VertexId, b: VertexId): void => {
    mate[a] = b;
    mate[b] = a;
  };
  layer.matching.mate.forEach((partner, id) => {
    if (partner === UNMATCHED || id === blossom || partner === blossom) return;
    pair(renamed(itemAt(layer.nodes, id)), renamed(itemAt(layer.nodes, partner)));
  });
  const outside = itemAt(layer.matching.mate, blossom);
  if (outside !== UNMATCHED) {
    pair(renamed(itemAt(flower.cycle, 0)), renamed(itemAt(layer.nodes, outside)));
  }
  for (let i = 1; i < flower.cycle.length; i += 2) {
    pair(renamed(itemAt(flower.cycle, i)), renamed(itemAt(flower.cycle, i + 1)));
  }

  return {
    original: layer.original,
    graph: projectGraph(layer.original.edges, nodes.length, (v) => itemAt(nodeOf, v)),
    matching: { mate },
    nodes,
    nodeOf,
  };
}
