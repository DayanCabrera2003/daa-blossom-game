import { contract } from '../../blossom/contract';
import { findOddCycle } from '../../blossom/detect';
import { foldForest } from '../../edmonds/foldForest';
import { hasEdge } from '../../graph/queries';
import { invariant } from '../../shared/invariant';
import { itemAt } from '../../shared/itemAt';
import { contractEvent } from '../../trace/contractEvent';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * Fold at the conflict (level 4.4): the player touches the vine where two suns of one tree meet.
 * Their loop folds into a flower that shines as a sun, and the search goes on from it, exactly as
 * in the recipe (`foldForest`): now every dark vine of every petal can be explored.
 */
export function foldAt(
  state: GardenState,
  action: Extract<Action, { type: 'foldAt' }>,
): ActionOutcome {
  // A touched vine has no direction, and the loop's direction depends on which sun comes first;
  // taking the smaller sprout first makes d–b and b–d fold exactly the same flower.
  const [from, to] = action.from < action.to ? [action.from, action.to] : [action.to, action.from];
  const invalid = requireSprouts(state, [from, to]);
  if (invalid) return reject(invalid);
  if (!hasEdge(state.graph, from, to)) return reject({ code: 'notAdjacent', u: from, v: to });
  const { layer, search } = state;
  const u = itemAt(layer.nodeOf, from);
  const x = itemAt(layer.nodeOf, to);
  const sunsOfOneTree =
    search !== null &&
    u !== x &&
    search.label[u] === 'outer' &&
    search.label[x] === 'outer' &&
    search.root[u] === search.root[x];
  if (!sunsOfOneTree) return reject({ code: 'notSunsOfOneTree', u: from, v: to });

  const folded = contract(layer, findOddCycle(search, u, x));
  const flower = folded.layer.nodes[folded.blossom];
  invariant(flower?.kind === 'blossom', 'a fold must produce a flower');
  return accept(
    {
      ...state,
      layer: folded.layer,
      search: foldForest(search, layer, folded.layer, folded.blossom),
    },
    [{ type: 'oddCycleFound', vine: [from, to] }, contractEvent(flower)],
  );
}
