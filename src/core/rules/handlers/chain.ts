import { flipAlong } from '../../matching/augment';
import { checkAugmentingPath, checkStem } from '../../matching/paths';
import { isExposed } from '../../matching/queries';
import type { Action } from '../actions';
import { requireSprouts, requireUnfolded } from '../checks';
import { reject, type ActionOutcome } from '../outcome';
import { relight } from '../relight';
import type { GardenState } from '../state';

/**
 * Chain (levels 1.3, 1.4): drag from a sprout in the dark along alternating vines and let the
 * lanterns slide. Ending in the dark it is an augmenting path, +1 lantern; ending on a lantern it
 * is an even alternating path (a stem), gain 0, which is legal and shown in grey. Anything else
 * would break exclusivity, and the reason says where the path goes wrong.
 *
 * A chain may not go through a closed flower, which has to be opened first (4.5), but flowers folded
 * elsewhere are no obstacle (4.8). Lighting the chain changes the lanterns, so the whole garden
 * opens again and the marks are wiped, as at the end of a round of the recipe (`relight`).
 */
export function chain(
  state: GardenState,
  { path }: Extract<Action, { type: 'chain' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, path) ?? requireUnfolded(state, path);
  if (invalid) return reject(invalid);
  const end = path[path.length - 1];
  const endsInTheDark = path.length > 1 && end !== undefined && isExposed(state.matching, end);
  const checked = endsInTheDark
    ? checkAugmentingPath(state.graph, state.matching, path)
    : checkStem(state.graph, state.matching, path);
  if (!checked.ok) return reject({ code: 'invalidPath', error: checked.error });
  return relight(state, flipAlong(state.matching, path), [{ type: 'augment', path }]);
}
