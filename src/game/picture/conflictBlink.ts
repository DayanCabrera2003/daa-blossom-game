import { LOOK } from './look';

/**
 * The conflict of sun and moon (GDD §4.1, key animation 3; level 4.2): the vine that joins two
 * suns of one tree, and the sprouts at its ends, blink between the sun's gold and the moon's blue,
 * as if the garden could not make up its mind, and fade as the step ends. A curiosity, never an
 * error: no red.
 */

/** How many times it turns from sun to moon. */
export const CONFLICT_BLINKS = LOOK.conflictBlinks;

/** What the conflict shows at a moment: whose colour, and how strongly. */
export interface ConflictBlink {
  readonly tone: 'sun' | 'moon';
  readonly alpha: number;
}

/** The conflict `progress` (0 to 1) of the way through its step. */
export function conflictBlink(progress: number): ConflictBlink {
  const p = Math.min(1, Math.max(0, progress));
  const half = Math.min(2 * CONFLICT_BLINKS - 1, Math.floor(p * 2 * CONFLICT_BLINKS));
  return { tone: half % 2 === 0 ? 'sun' : 'moon', alpha: 1 - LOOK.conflictFade * p };
}
