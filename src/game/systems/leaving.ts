import { TOAST_FADE_MS, toastDuration } from '../picture/toastDuration';
import { betRight, isPast } from './flow';
import { floorOf } from './history';
import type { LevelSession } from './levelSession';
import { computeStars, type StarResult } from './stars';

/**
 * What a press of «Volver» (or Escape with nothing open) does: warn first, or leave, keeping the
 * win of a play step already won.
 */
export type LeavePress =
  /** The notice is shown; a second press before `until` (the clock's milliseconds) leaves. */
  | { readonly kind: 'warn'; readonly until: number }
  /** The level is left; `win` holds the stars to keep when the script had not saved them yet. */
  | { readonly kind: 'leave'; readonly win: StarResult | null };

/** Whether the play step is behind: its victory was reached, whatever the script still says. */
const victoryReached = (session: LevelSession): boolean => isPast(session.flow, 'play');

/** Whether the player moved the garden past where the play step began. */
const movesMade = (session: LevelSession): boolean =>
  session.history.states.length - 1 > floorOf(session.history);

/**
 * The stars of a play step won whose script is still running (closing lines, the notebook): the
 * session fixes them only when the script ends, so leaving before would lose the win. They count
 * what the level was played with until now.
 */
function winSoFar(session: LevelSession): StarResult | null {
  if (session.won !== null || !victoryReached(session)) return null;
  return computeStars({
    hintsOpened: session.hints.opened,
    waterSpent: session.waterSpent,
    waterBudget: session.level.data.water,
    betRight: betRight(session.flow),
  });
}

/**
 * A press of «Volver» at `now` (milliseconds of the clock), the notice `notice` having been shown
 * until `warnedUntil` (null: never). With moves made, and the play step neither won nor its script
 * over, the first press only warns, for as long as the notice stays in sight (`notice` measures
 * it); a second press while it shows leaves (GDD §5.2). Leaving keeps the win of a play step
 * already won.
 */
export function pressLeave(
  session: LevelSession,
  warnedUntil: number | null,
  now: number,
  notice: string,
): LeavePress {
  const warned = warnedUntil !== null && now <= warnedUntil;
  const settled = session.won !== null || victoryReached(session);
  if (!settled && movesMade(session) && !warned) {
    return { kind: 'warn', until: now + toastDuration(notice) + TOAST_FADE_MS };
  }
  return { kind: 'leave', win: winSoFar(session) };
}
