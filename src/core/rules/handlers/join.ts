import { addPair } from '../../matching/edit';
import type { Action } from '../actions';
import { requireOpenGarden, requireSprouts, requireVisibleVines } from '../checks';
import { reject, type ActionOutcome } from '../outcome';
import { relight } from '../relight';
import type { GardenState } from '../state';

/** Join (level 0.1): light a lantern between two neighbors in the dark, along a vine in sight. */
export function join(
  state: GardenState,
  { u, v }: Extract<Action, { type: 'join' }>,
): ActionOutcome {
  const invalid =
    requireSprouts(state, [u, v]) ?? requireOpenGarden(state) ?? requireVisibleVines(state, [u, v]);
  if (invalid) return reject(invalid);
  const result = addPair(state.graph, state.matching, u, v);
  if (!result.ok) {
    return reject(
      result.error.code === 'alreadyMatched'
        ? { code: 'alreadyLit', vertex: result.error.vertex }
        : { code: 'notAdjacent', u, v },
    );
  }
  return relight(state, result.value, [{ type: 'light', u, v }]);
}
