import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';

/** Every action of the game: a demo is played with all of them allowed. */
const EVERY_ACTION: ReadonlySet<ActionType> = new Set(Object.keys(UNLOCKED_AT) as ActionType[]);

/**
 * The states a replayed day walks through, dawn to dusk (plan 03, phase 3). Without a demo it is
 * the player's own day. With one, it is the garden those moves make from the start of the level,
 * with every action allowed, so what is seen matches what the mentor says however the player
 * solved it (1.1, 1.2); the player's history is never touched. The rules make every state.
 */
export function dayToReplay(
  level: Level,
  playerDay: readonly GardenState[],
  demo: readonly Action[] | null,
): readonly GardenState[] {
  if (demo === null) return playerDay;
  let state: GardenState = { ...level.start, allowed: EVERY_ACTION };
  const day = [state];
  for (const action of demo) {
    const outcome = applyAction(state, action);
    // Level integrity plays every demo with the rules, so a refusal here is a broken catalog.
    invariant(outcome.ok, 'the rules accept every move of a demo');
    state = outcome.state;
    day.push(state);
  }
  return day;
}
