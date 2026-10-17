import { baseVertex } from '../../blossom/hierarchy';
import { isExposed } from '../../matching/queries';
import { plantForest } from '../../search/forest';
import { itemAt } from '../../shared/itemAt';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * Mark a root (level 3.1): "a lonely sprout you start from is a sun". The sprout, or the flower
 * holding it, must be in the dark and not yet marked; it starts a tree of its own. A level may name
 * the only sprouts a search starts from (4.1 searches from R alone, so its light can "lie"); any
 * other is refused as `notARoot`.
 */
export function markRoot(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'markRoot' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [vertex]);
  if (invalid) return reject(invalid);
  if (state.roots !== null && !state.roots.includes(vertex)) {
    return reject({ code: 'notARoot', vertex });
  }
  const { layer } = state;
  const node = itemAt(layer.nodeOf, vertex);
  if (!isExposed(layer.matching, node)) return reject({ code: 'notInTheDark', vertex });
  const forest = state.search ?? plantForest(layer.matching, []);
  if (forest.label[node] !== 'none') return reject({ code: 'alreadyMarked', vertex });

  const search = {
    label: forest.label.map((mark, id) => (id === node ? 'outer' : mark)),
    parent: forest.parent,
    root: forest.root.map((r, id) => (id === node ? node : r)),
  };
  const root = baseVertex(itemAt(layer.nodes, node));
  return accept({ ...state, search }, [{ type: 'labelOuter', vertex: root, parent: null, root }]);
}
