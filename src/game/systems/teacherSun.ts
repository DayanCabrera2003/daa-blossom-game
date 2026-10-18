import type { UiEvent } from './levelController';
import { fractionOfStep } from './sun';

/** The move of the sun that shows one step of the day. */
export type SunSeek = Extract<UiEvent, { readonly kind: 'seek' }>;

/**
 * The move of the game's sun a row of "Your day" asks for on the teacher's panel (GDD §5.8): the
 * panel follows the sun, and a press on a row moves the sun to that step, so the garden and the
 * panel always show the same garden. It is the slider's own move, to the position of step `step`
 * of a day of `length` gardens (kept inside the day), so the game takes it like a drag of the sun.
 */
export function teacherSun(step: number, length: number): SunSeek {
  const kept = Math.max(0, Math.min(length - 1, step));
  return { kind: 'seek', fraction: fractionOfStep(kept, length) };
}
