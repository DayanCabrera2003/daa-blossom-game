import type { Action, ActionType } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import { playDay, type PlayedDay } from './playedDay';

/**
 * A day the garden plays with tools lent for it (plan 08, phase 13): the mechanical gardener
 * solving a garden of the free mode, or the certificate placed on it, may use moves the player has
 * not learnt yet. The moves are played by the rules on a copy of `from` that also allows `lent`,
 * looks at the whole garden (no fog, any sprout a root) as the gardener does, and every garden of
 * the day is then given back with the player's own tools, roots and fog: the gardener shows what he
 * knows, and never hands it over (GDD §5.7). A move refused even so is a broken plan, said aloud
 * with `whose` moves they were.
 */
export function lentDay(
  from: GardenState,
  moves: readonly Action[],
  lent: readonly ActionType[],
  whose: string,
): PlayedDay {
  const lending: GardenState = {
    ...from,
    allowed: new Set([...from.allowed, ...lent]),
    roots: null,
    revealed: null,
  };
  const played = playDay(lending, moves, whose);
  const { allowed, roots, revealed } = from;
  return {
    // Dawn is the player's garden itself; every garden after it, with the player's tools again.
    states: played.states.map((state, i) =>
      i === 0 ? from : { ...state, allowed, roots, revealed },
    ),
    events: played.events,
  };
}
