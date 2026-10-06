import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import { withSprout, withoutSprout } from '../sproutSet';
import type { GardenState } from '../state';

/** Place a scarecrow (level 3.7): it guards every vine of its sprout. */
export function placeScarecrow(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'placeScarecrow' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, [vertex]);
  if (invalid) return reject(invalid);
  const scarecrows = withSprout(state.scarecrows, vertex);
  if (!scarecrows.ok) return reject(scarecrows.error);
  return accept({ ...state, scarecrows: scarecrows.value }, [
    { type: 'scarecrow', vertex, placed: true },
  ]);
}

/** Take a scarecrow off its sprout. */
export function removeScarecrow(
  state: GardenState,
  { vertex }: Extract<Action, { type: 'removeScarecrow' }>,
): ActionOutcome {
  const scarecrows = withoutSprout(state.scarecrows, vertex);
  if (!scarecrows.ok) return reject(scarecrows.error);
  return accept({ ...state, scarecrows: scarecrows.value }, [
    { type: 'scarecrow', vertex, placed: false },
  ]);
}
