import { neighbors } from '../../graph/queries';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * Inspect (level 3.1): in the fog, show the vines of one sprout for a drop of water. Water is only
 * counted (a star condition, GDD §5.4), so inspecting never fails for lack of it.
 */
export function inspect(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'inspect' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [vertex]);
  if (invalid) return reject(invalid);
  if (state.revealed === null) return reject({ code: 'noFog' });
  if (state.revealed[vertex]) return reject({ code: 'alreadyInspected', vertex });
  const revealed = state.revealed.map((seen, v) => seen || v === vertex);
  return accept({ ...state, revealed, waterUsed: state.waterUsed + 1 }, [
    { type: 'inspect', vertex, vines: [...neighbors(state.graph, vertex)] },
  ]);
}
