import { baseVertex } from '../../blossom/hierarchy';
import type { GardenNode } from '../../blossom/types';
import type { VertexId } from '../../graph/types';
import { isExposed } from '../../matching/queries';
import { plantForest } from '../../search/forest';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * Mark a root (level 3.1): "a lonely sprout you start from is a sun". The sprout, or the flower
 * holding it, must be in the dark and not yet marked; it starts a tree of its own.
 */
export function markRoot(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'markRoot' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [vertex]);
  if (invalid) return reject(invalid);
  const { layer } = state;
  const node = layer.nodeOf[vertex] as VertexId;
  if (!isExposed(layer.matching, node)) return reject({ code: 'notInTheDark', vertex });
  const forest = state.search ?? plantForest(layer.matching, []);
  if (forest.label[node] !== 'none') return reject({ code: 'alreadyMarked', vertex });

  const search = {
    label: forest.label.map((mark, id) => (id === node ? 'outer' : mark)),
    parent: forest.parent,
    root: forest.root.map((r, id) => (id === node ? node : r)),
  };
  const root = baseVertex(layer.nodes[node] as GardenNode);
  return accept({ ...state, search }, [{ type: 'labelOuter', vertex: root, parent: null, root }]);
}
