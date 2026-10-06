import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import { withSprout, withoutSprout } from '../sproutSet';
import type { GardenState } from '../state';

/** Lift a stone (level 7.2): the sprout is taken out and the garden splits into groups. */
export function liftStone(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'liftStone' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [vertex]);
  if (invalid) return reject(invalid);
  const stones = withSprout(state.stones, vertex);
  if (!stones.ok) return reject(stones.error);
  return accept({ ...state, stones: stones.value }, [{ type: 'stone', vertex, lifted: true }]);
}

/** Put a lifted stone back. */
export function dropStone(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'dropStone' }>,
): ActionOutcome {
  const stones = withoutSprout(state.stones, vertex);
  if (!stones.ok) return reject(stones.error);
  return accept({ ...state, stones: stones.value }, [{ type: 'stone', vertex, lifted: false }]);
}
