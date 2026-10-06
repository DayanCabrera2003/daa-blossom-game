import { hasEdge } from '../../graph/queries';
import { flipAlong } from '../../matching/augment';
import { isExposed, mateOf } from '../../matching/queries';
import type { Action } from '../actions';
import { requireOpenGarden, requireSprouts } from '../checks';
import { reject, type ActionOutcome } from '../outcome';
import { relight } from '../relight';
import type { GardenState } from '../state';

/**
 * Pass the lantern (level 1.1): a sprout in the dark asks a lit neighbor, who hands over the
 * lantern; the neighbor's old partner goes dark. It is the shortest chain of gain 0:
 * from–to=partner becomes from=to–partner.
 */
export function passLantern(
  state: GardenState,
  { from, to }: Extract<Action, { type: 'passLantern' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [from, to]) ?? requireOpenGarden(state);
  if (invalid) return reject(invalid);
  if (!hasEdge(state.graph, from, to)) return reject({ code: 'notAdjacent', u: from, v: to });
  if (!isExposed(state.matching, from)) return reject({ code: 'alreadyLit', vertex: from });
  if (isExposed(state.matching, to)) return reject({ code: 'noLanternToPass', vertex: to });
  const path = [from, to, mateOf(state.matching, to)];
  return relight(state, flipAlong(state.matching, path), [{ type: 'augment', path }]);
}
