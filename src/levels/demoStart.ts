import type { ActionType } from '@core/rules/actions';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { GardenState } from '@core/rules/state';

/** Every action of the game: a demo is played with all of them allowed. */
export const EVERY_ACTION: ReadonlySet<ActionType> = new Set(
  Object.keys(UNLOCKED_AT) as ActionType[],
);

/**
 * The garden a demo is played from (plan 03, phase 1): the start of the level, with every action
 * allowed, so a demo can show a move the level itself has not unlocked yet. The level checks and
 * the replayed day both start from it, so what is checked is what is shown.
 */
export const demoStart = (start: GardenState): GardenState => ({ ...start, allowed: EVERY_ACTION });
