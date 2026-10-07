import { baseVertex } from '../blossom/hierarchy';
import type { Layer } from '../blossom/types';
import type { VertexId } from '../graph/types';
import { NO_VERTEX, type AlternatingForest, type ForestLabel } from '../search/forest';
import { itemAt } from '../shared/itemAt';

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
    id === NO_VERTEX ? NO_VERTEX : itemAt(after.nodeOf, baseVertex(itemAt(before.nodes, id)));
  const base = itemAt(before.nodeOf, baseVertex(itemAt(after.nodes, blossom)));

  const n = after.nodes.length;
  const label = new Array<ForestLabel>(n).fill('none');
  const parent = new Array<VertexId>(n).fill(NO_VERTEX);
  const root = new Array<VertexId>(n).fill(NO_VERTEX);
  forest.label.forEach((mark, id) => {
    const target = rename(id);
    if (target === blossom) return;
    label[target] = mark;
    parent[target] = rename(itemAt(forest.parent, id));
    root[target] = rename(itemAt(forest.root, id));
  });
  label[blossom] = 'outer';
  parent[blossom] = rename(itemAt(forest.parent, base));
  root[blossom] = rename(itemAt(forest.root, base));
  return { label, parent, root };
}
