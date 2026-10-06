import type { VertexId } from '../graph/types';
import { invariant } from '../shared/invariant';
import type { AlternatingForest } from '../search/forest';
import { pathToRoot } from '../search/pathToRoot';
import { itemAt } from '../shared/itemAt';

/**
 * The flower closed by a vine between two suns `u` and `x` of the same tree (levels 4.2, 4.4).
 * Climbing from both towards the root, the two climbs first meet at their lowest common ancestor,
 * which is a sun: below a moon there is a single child, so two distinct climbs cannot merge there.
 * That ancestor is the base. The loop runs from the base down to `u`, across u–x, and up from `x`
 * back to the base: two alternating climbs of even length plus one dark vine, so its length is
 * odd and it holds one lantern per pair of sprouts besides the base.
 *
 * Returned base first, in that direction, which is the normal form `checkBlossom` produces.
 */
export function findOddCycle(forest: AlternatingForest, u: VertexId, x: VertexId): VertexId[] {
  invariant(
    forest.label[u] === 'outer' && forest.label[x] === 'outer',
    `${u} and ${x} must both be suns`,
  );
  invariant(forest.root[u] === forest.root[x], `${u} and ${x} must share a tree`);

  const fromU = pathToRoot(forest, u);
  const fromX = pathToRoot(forest, x);
  const onClimbFromX = new Set(fromX);
  const ancestorIndex = fromU.findIndex((vertex) => onClimbFromX.has(vertex));
  const ancestor = itemAt(fromU, ancestorIndex);

  const down = fromU.slice(0, ancestorIndex + 1).reverse();
  const up = fromX.slice(0, fromX.indexOf(ancestor));
  return [...down, ...up];
}
