import { removePair } from '../../matching/edit';
import type { Action } from '../actions';
import { requireOpenGarden, requireSprouts } from '../checks';
import { reject, type ActionOutcome } from '../outcome';
import { relight } from '../relight';
import type { GardenState } from '../state';

/** Split (level 0.1): put out the lantern two sprouts share. */
export function split(
  state: GardenState,
  { u, v }: Extract<Action, { type: 'split' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [u, v]) ?? requireOpenGarden(state);
  if (invalid) return reject(invalid);
  const result = removePair(state.matching, u, v);
  if (!result.ok) return reject({ code: 'notLit', u, v });
  return relight(state, result.value, [{ type: 'putOut', u, v }]);
}
