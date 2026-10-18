import { EMPTY_DESIGN, limitBreach, type Design } from './design';
import { importText } from './importText';

/**
 * The design the free mode opens with (plan 08, phase 11): the garden a shared link brings
 * (`?garden=`), read here, in the free mode's own chunk, so its decoder never weighs on the game's
 * start; otherwise the last design kept. The kept one is held to the free mode's limits as an
 * imported one is (the store only checks its shape). Whatever cannot be opened is said kindly, and
 * the free mode still opens.
 */

/** What could not be opened: the link's garden, or the design kept. */
export type OpeningProblem = 'brokenCode' | 'brokenStored';

/** The design to open, and what had to be set aside to open it, if anything. */
export interface Opening {
  readonly design: Design;
  readonly problem: OpeningProblem | null;
}

/** Opens the link's `code`, if any, else the `stored` design, else the empty one. */
export function openingDesign(code: string | null, stored: Design): Opening {
  const kept = limitBreach(stored) === null ? stored : null;
  if (code !== null) {
    const read = importText(code);
    if (read.ok) return { design: read.value, problem: null };
    return { design: kept ?? EMPTY_DESIGN, problem: 'brokenCode' };
  }
  return kept === null
    ? { design: EMPTY_DESIGN, problem: 'brokenStored' }
    : { design: kept, problem: null };
}
