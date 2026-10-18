import { cssPixel, integerZoom, MIN_CSS_PIXEL } from './integerZoom';

/**
 * Whether the game asks to turn the phone (plan 09, phase 7; the author's answer to question 17 of
 * appendix A): a window held upright, `width` × `height` CSS pixels at `density` device pixels per
 * CSS pixel, where the canvas at its whole zoom would show its logical pixel under `MIN_CSS_PIXEL`.
 * Then only the notice "gira el teléfono" is shown over the game, which cannot be closed and is not
 * played until the phone is turned; turned, the notice goes by itself. A tablet held upright still
 * shows the game at ×1 or more, so it is played as it is.
 */
export function asksToTurn(width: number, height: number, density: number): boolean {
  if (height <= width) return false;
  return cssPixel(integerZoom(width, height, density), density) < MIN_CSS_PIXEL;
}
