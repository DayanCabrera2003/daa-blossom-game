import { baseVertex } from '../blossom/hierarchy';
import type { GardenNode, Layer } from '../blossom/types';
import type { VertexId } from '../graph/types';
import { NO_VERTEX, type AlternatingForest, type ForestLabel } from '../search/forest';

/**
 * Carries a search forest over a fold, from garden `before` to `after` (= `before` with the flower
 * `blossom` folded), so the search continues instead of starting over (Códex C10).
 *
 * The flower becomes a sun in the place of its base: same parent, same root. Every sprout outside
 * the loop keeps its mark, and links to any petal now point to the flower. Nothing else changes:
 * moons inside the loop were lit by petals, so no sun outside hung from them, and every vine from a
 * petal to the outside now leaves a sun, which is why the flower must be scanned again.
 */
export function foldForest(
  forest: AlternatingForest,
  before: Layer,
  after: Layer,
  blossom: VertexId,
): AlternatingForest {
  const rename = (id: VertexId): VertexId =>
    id === NO_VERTEX
      ? NO_VERTEX
      : (after.nodeOf[baseVertex(before.nodes[id] as GardenNode)] as VertexId);
  const base = before.nodeOf[baseVertex(after.nodes[blossom] as GardenNode)] as VertexId;

  const n = after.nodes.length;
  const label = new Array<ForestLabel>(n).fill('none');
  const parent = new Array<VertexId>(n).fill(NO_VERTEX);
  const root = new Array<VertexId>(n).fill(NO_VERTEX);
  forest.label.forEach((mark, id) => {
    const target = rename(id);
    if (target === blossom) return;
    label[target] = mark;
    parent[target] = rename(forest.parent[id] as VertexId);
    root[target] = rename(forest.root[id] as VertexId);
  });
  label[blossom] = 'outer';
  parent[blossom] = rename(forest.parent[base] as VertexId);
  root[blossom] = rename(forest.root[base] as VertexId);
  return { label, parent, root };
}
