/** The internal canvas of the game (GDD §4.1): every pixel of the art lives on this grid. */
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 270;

/**
 * The largest whole zoom at which the canvas fits the window, so pixel art stays crisp (no
 * filtering, no uneven pixels): ×4 on 1080p, ×3 on 1440×810. A window too small for ×1 still
 * gets ×1 and scrolls, rather than a blurry fractional scale.
 */
export function integerZoom(windowWidth: number, windowHeight: number): number {
  const fit = Math.floor(Math.min(windowWidth / CANVAS_WIDTH, windowHeight / CANVAS_HEIGHT));
  return Math.max(1, fit);
}
