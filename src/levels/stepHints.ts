import type { Level, LevelHint } from './build';
import type { LevelStep } from './flow';

/** The steps in which a hint may be offered (never while the day replays, nor in plain waits). */
const HINT_STEPS: ReadonlySet<LevelStep['step']> = new Set([
  'play',
  'look',
  'certifyAgain',
  'ask',
  'count',
  'draw',
  'pickVine',
  'flowerChallenge',
  'recipe',
]);

/**
 * The steps that play the garden: one that brings no hints of its own says the level's. The
 * council's call for another certificate (7.6) is played like the step it follows, and so is the
 * look that comes before a play step (3.1).
 */
const PLAYING: ReadonlySet<LevelStep['step']> = new Set(['play', 'look', 'certifyAgain']);

/**
 * The hints script step `index` of `level` offers (GDD §5.3), in grade order, or null when it offers
 * none: its own when it brings them; otherwise the level's in a step that plays the garden, and
 * none in any other step, so a hint written for playing is never said under a question. Never
 * while the day replays or in plain waits, nor in a mirror challenge nobody can win (2.4, second
 * phase: there is nothing to find), nor once the script is over. A step may offer an empty list
 * (a play step of a level that writes no hints): the generic lines speak for every grade.
 */
export function hintsAt(level: Level, index: number): readonly LevelHint[] | null {
  const step = level.flow[index];
  if (step === undefined || !HINT_STEPS.has(step.step)) return null;
  if (step.step === 'draw' && !step.beatable) return null;
  return level.stepHints[index] ?? (PLAYING.has(step.step) ? level.hints : null);
}
