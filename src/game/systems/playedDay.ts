import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import type { TraceEvent } from '@core/trace/events';

/**
 * A day the garden plays by itself with the rules (the light's own search, the automaton's run):
 * every garden of the day, dawn first, and beside each the events the rules answered to the move
 * that made it (none at dawn). The sun walks the gardens; the teacher's panel reads the events.
 */
export interface PlayedDay {
  readonly states: readonly GardenState[];
  readonly events: readonly (readonly TraceEvent[])[];
}

/**
 * Plays `moves` from `from` with the rules. Level integrity plays every such day, so a move the
 * rules refuse is a broken catalog: it stops loudly, saying whose moves (`whose`) were refused.
 */
export function playDay(from: GardenState, moves: readonly Action[], whose: string): PlayedDay {
  let state = from;
  const states = [state];
  const events: (readonly TraceEvent[])[] = [[]];
  for (const move of moves) {
    const outcome = applyAction(state, move);
    invariant(outcome.ok, `the rules accept every move of ${whose}`);
    state = outcome.state;
    states.push(state);
    events.push(outcome.events);
  }
  return { states, events };
}
