import type { TouchRefusal } from '../input/intent';
import type { Effect } from './levelController';

/**
 * What the level screen shows for a touch that made no move: why, when the touch says it
 * (`input/intent.ts`, a vine in the dark touched with the lanterns), or nothing at all.
 */
export const touchEffects = (refusal: TouchRefusal | undefined): Effect[] =>
  refusal === undefined ? [] : [{ kind: 'touchRefused', reason: refusal }];
