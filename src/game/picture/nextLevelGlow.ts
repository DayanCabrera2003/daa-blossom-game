import type { Rect } from './boxDistance';

/**
 * The glow behind the next level to play in the hub (GDD §6): a warm halo a couple of pixels round
 * its button that brightens and fades slowly, like the glow behind an open secret flower, and that
 * holds still halfway when the player's system asks for less motion. Pure: the hub draws it under
 * the button's wood and tweens its opacity between these.
 */
export const NEXT_GLOW = {
  /** How far the halo shows round the wood, in pixels: less than the gap between two buttons. */
  halo: 2,
  /** Its opacity at its faintest and at its brightest. */
  alpha: { from: 0.2, to: 0.7 },
  /** Its opacity when it holds still. */
  still: 0.5,
  /** How long it takes to brighten or to fade, in milliseconds. */
  ms: 900,
} as const;

/** The box of the halo round a button's `box`. */
export function nextLevelGlow(box: Rect): Rect {
  const { halo } = NEXT_GLOW;
  return {
    x: box.x - halo,
    y: box.y - halo,
    width: box.width + 2 * halo,
    height: box.height + 2 * halo,
  };
}
