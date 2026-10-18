import type { LevelSession } from './levelSession';
import { push } from './history';
import type { PlayedDay } from './playedDay';

/**
 * The session with `day` played after the garden shown (plan 08, phase 13): every garden after its
 * dawn enters the history as a move the rules accepted, beside the events they answered, so the
 * sun walks it and the teacher's panel writes it like the player's own. As with any move, whatever
 * had been undone is dropped. `day` must start at the garden shown now.
 */
export function appendDay(session: LevelSession, day: PlayedDay): LevelSession {
  const history = day.states.slice(1).reduce(push, session.history);
  const dayEvents = [
    ...session.dayEvents.slice(0, session.history.cursor + 1),
    ...day.events.slice(1),
  ];
  return { ...session, history, dayEvents };
}
