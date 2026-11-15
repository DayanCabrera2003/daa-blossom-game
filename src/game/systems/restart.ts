import { itemAt } from '@core/shared/itemAt';
import { initialPointer } from '../input/pointer';
import { NO_FILLS } from '../input/liftDrag';
import { OUTSIDE } from '../picture/layers';
import { floorOf } from './history';
import type { Controller } from './levelController';
import { takesMoves, type LevelSession } from './levelSession';

/**
 * «Reiniciar» (GDD §5.2): the play step on screen goes back to where it began. The day is cut at
 * the floor of undo, so the garden is the one the step started with (its lanterns, its marks, its
 * fog) and the moves are gone, not undone: restarting cannot be redone. The water spent since is
 * given back: what is left spent is what the garden at the floor had used. The hints opened, the
 * reactions already said and what the playtest counts stay as they were. Outside a step that takes
 * moves (a question, a replay) nothing changes.
 */
export function restartSession(session: LevelSession): LevelSession {
  if (!takesMoves(session)) return session;
  const { history } = session;
  const floor = floorOf(history);
  const states = history.states.slice(0, floor + 1);
  return {
    ...session,
    history: { ...history, states, cursor: floor },
    dayEvents: session.dayEvents.slice(0, floor + 1),
    waterSpent: itemAt(states, floor).waterUsed,
  };
}

/**
 * Restarts the play step on the level screen: the session as `restartSession` leaves it, with the
 * tool in hand kept and everything half done let go (a chain being drawn, the gaps filled by
 * lifting, the flowers entered with the layers), and the glows of a hint put out.
 */
export const restartController = (controller: Controller): Controller => ({
  ...controller,
  session: restartSession(controller.session),
  pointer: initialPointer(controller.pointer.tool),
  highlight: [],
  vineGlow: null,
  layers: OUTSIDE,
  lift: NO_FILLS,
});
