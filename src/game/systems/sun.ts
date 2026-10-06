/**
 * The sun of the top bar is a slider over the day (GDD 0.5, §4.1): dawn is the first state of the
 * history, dusk the last. The view works with a position from 0 to 1; the history with steps.
 */

/** The history step at a slider position, snapped to the nearest step and kept inside the day. */
export function stepAtFraction(fraction: number, length: number): number {
  if (length <= 1) return 0;
  const clamped = Math.max(0, Math.min(1, fraction));
  return Math.round(clamped * (length - 1));
}

/** The slider position of a history step; a day of one state keeps the sun at dusk. */
export function fractionOfStep(step: number, length: number): number {
  return length <= 1 ? 1 : step / (length - 1);
}
