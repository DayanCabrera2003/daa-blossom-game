import type { LevelStep } from '@levels/flow';
import { layFloor } from './history';
import type { LevelSession } from './levelSession';
import { startChallenge } from './mirrorChallenge';

/** What a step of the script resets as it begins. */
export type StepStart = Pick<LevelSession, 'challenge' | 'history'>;

/**
 * What `step`, beginning now, resets in `session`: a mirror challenge starts from a clean drawing
 * (2.4 holds two of them), and a play step lays the floor of undo where it starts (GDD §5.2), so
 * the search the garden showed before it (the light's in 4.1, the gardener's in 7.4) is never
 * undone. Any other step leaves both as they were.
 */
export const startStep = (
  session: Pick<LevelSession, 'level' | 'challenge' | 'history'>,
  step: LevelStep | null,
): StepStart => ({
  challenge: step?.step === 'draw' ? startChallenge(session.level.start.graph) : session.challenge,
  history: step?.step === 'play' ? layFloor(session.history) : session.history,
});
