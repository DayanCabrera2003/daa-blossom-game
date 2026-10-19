import type { ActionType } from '@core/rules/actions';
import type { Level } from './build';

/** Something wrong with a level where the light searches by itself (plan 10, section 2.4). */
export type LightProblem =
  /**
   * A move that changes the lanterns without the light is open: with it, the chain could be lit
   * without the light ever meeting the flower, so the level would not need folding (plan 10, X1).
   */
  { readonly code: 'lightBypassed'; readonly action: ActionType };

/** The moves that change the lanterns along a path of their own, never the light's. */
const ALWAYS_BYPASS: readonly ActionType[] = ['split', 'passLantern', 'rotateStem'];

/** The moves that light a lantern, which only the rule of the chain seen ties to the light. */
const LIGHTING: readonly ActionType[] = ['join', 'chain'];

/**
 * The checks of a level where the light searches by itself (`light`): every move that changes the
 * lanterns without the light is closed in its `forbid`. Joining and chains may stay open only when
 * the level's chain rule is `seen`, so the one chain they can light is the chain the light saw.
 * Listed in the order of the unlock table. A level whose search is the player's has nothing to check.
 */
export function checkLight(level: Level): LightProblem[] {
  if (!level.data.light) return [];
  const { allowed, chains } = level.start;
  const bypass = (action: ActionType): boolean =>
    ALWAYS_BYPASS.includes(action) || (LIGHTING.includes(action) && chains.rule !== 'seen');
  return [...allowed]
    .filter(bypass)
    .map((action): LightProblem => ({ code: 'lightBypassed', action }));
}
