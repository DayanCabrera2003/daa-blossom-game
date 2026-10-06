import { expandPath } from '../../blossom/expand';
import { baseVertex } from '../../blossom/hierarchy';
import { hasEdge } from '../../graph/queries';
import type { VertexId } from '../../graph/types';
import { isMatchedEdge } from '../../matching/queries';
import { growStep } from '../../search/growForest';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';
import { itemAt } from '../../shared/itemAt';

/**
 * Look from a sun along a dark vine (level 3.1). The rules are those of the algorithm itself
 * (`growStep`), so what the player is allowed to do is exactly what the recipe does:
 * - an unmarked lit sprout becomes a moon, and its partner a sun;
 * - a sprout in the dark, or a sun of another tree, closes a chain (3.1, 3.4), which is shown;
 * - a moon stays as it is (3.3);
 * - a sun of the same tree is refused as `sunMeetsSun`: the conflict the player must learn to see
 *   (4.1) and later to fold (4.4).
 */
export function markMoon(
  state: GardenState,
  { from, to }: Extract<Action, { type: 'markMoon' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [from, to]);
  if (invalid) return reject(invalid);
  if (state.revealed !== null && !state.revealed[from]) {
    return reject({ code: 'vineHidden', vertex: from });
  }
  if (!hasEdge(state.graph, from, to)) return reject({ code: 'notAdjacent', u: from, v: to });

  const { layer, search } = state;
  const u = itemAt(layer.nodeOf, from);
  const x = itemAt(layer.nodeOf, to);
  if (u === x) return reject({ code: 'insideOneFlower', u: from, v: to });
  if (search?.label[u] !== 'outer') return reject({ code: 'notASun', vertex: from });
  if (isMatchedEdge(layer.matching, u, x)) return reject({ code: 'litVine', u: from, v: to });

  const step = growStep(layer.matching, search, u, x);
  const sproutOf = (id: VertexId): VertexId => baseVertex(itemAt(layer.nodes, id));
  switch (step.kind) {
    case 'alreadyInner':
      return reject({ code: 'alreadyMarked', vertex: to });
    case 'oddCycle':
      return reject({ code: 'sunMeetsSun', u: from, v: to });
    case 'chain': {
      const path = expandPath(layer, step.path);
      return accept({ ...state, chainSeen: path }, [{ type: 'chainFound', path }]);
    }
    case 'grow': {
      const root = sproutOf(itemAt(step.forest.root, u));
      const moon = sproutOf(step.inner);
      return accept({ ...state, search: step.forest }, [
        { type: 'labelInner', vertex: moon, parent: from, root },
        { type: 'labelOuter', vertex: sproutOf(step.outer), parent: moon, root },
      ]);
    }
  }
}
