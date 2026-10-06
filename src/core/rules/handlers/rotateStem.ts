import { rotateStem as rotate } from '../../blossom/rotateStem';
import type { Action } from '../actions';
import { requireOpenGarden, requireSprouts } from '../checks';
import { reject, type ActionOutcome } from '../outcome';
import { relight } from '../relight';
import type { GardenState } from '../state';

/**
 * Rotate the stem (level 4.10): a chain of gain 0 from a sprout in the dark, now with a name. The
 * darkness moves to the end of the stem, which is how a flower's base is made to sleep before
 * folding without losing anything (Códex C8).
 */
export function rotateStem(
  state: GardenState,
  { stem }: Extract<Action, { type: 'rotateStem' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, stem) ?? requireOpenGarden(state);
  if (invalid) return reject(invalid);
  const rotated = rotate(state.graph, state.matching, stem);
  if (!rotated.ok) return reject({ code: 'invalidPath', error: rotated.error });
  return relight(state, rotated.value, [{ type: 'augment', path: stem }]);
}
