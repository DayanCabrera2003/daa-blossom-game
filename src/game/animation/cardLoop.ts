/**
 * The timing of a mechanic card's demo (GDD §5.11): the tiny garden steps through its frames, the
 * last one stays a moment so the result can be read, and the demo starts again, for as long as the
 * card is open. Pure timing only; what each frame shows is decided by the demo itself.
 */

/** How long each frame of a demo stays on screen, in milliseconds (greybox value). */
export const CARD_STEP_MS = 900;

/** How many steps the last frame rests before the loop starts over. */
export const CARD_REST_STEPS = 2;

/** The frame of a demo of `frames` frames (at least one) shown `elapsed` ms after it opened. */
export function cardFrameAt(frames: number, elapsed: number): number {
  const steps = Number.isFinite(elapsed) ? Math.floor(Math.max(0, elapsed) / CARD_STEP_MS) : 0;
  return Math.min(steps % (frames + CARD_REST_STEPS), frames - 1);
}
