import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import type { Matching } from '@core/matching/types';

/**
 * How many threads of the tangle `yours ⊕ mirror` the reflection wins (2.5): the pieces of the
 * core's decomposition on which the reflection holds more lanterns than you. A loop always holds as
 * many of each side, so every piece counted is a thread. Shared by the answer key of the game and
 * the script checks, so the question and its check can never disagree.
 */
export const winningThreads = (yours: Matching, mirror: Matching): number =>
  decomposeSymmetricDifference(yours, mirror).filter((piece) => piece.gain > 0).length;
