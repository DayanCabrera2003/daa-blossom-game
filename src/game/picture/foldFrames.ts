import type { Point } from '../input/target';

/**
 * The eight frames of folding a flower (GDD §4.1: "los brotes del ciclo se juntan hacia el centro
 * y se cierran como pétalos; al desplegar, se abre en sentido inverso"): each frame says where the
 * sprouts of the cycle stand, on their straight way to the flower's middle, and how far the petals
 * have closed. Unfolding plays the same frames backwards. The animation only paints them.
 */

/** One frame: where each sprout of the cycle stands, and how closed the petals are (0 to 1). */
export interface FoldFrame {
  readonly positions: readonly Point[];
  readonly closed: number;
}

/** How many frames a fold takes. */
export const FOLD_FRAMES = 8;

/** Slow at the start and quick at the end, as petals that close over themselves. */
const easeIn = (t: number): number => t * t;

/** The frames of folding the sprouts at `open` into a flower at `centre`, open first. */
export function foldFrames(open: readonly Point[], centre: Point): FoldFrame[] {
  return Array.from({ length: FOLD_FRAMES }, (_, i): FoldFrame => {
    const closed = i / (FOLD_FRAMES - 1);
    const t = easeIn(closed);
    return {
      positions: open.map((p) =>
        i === FOLD_FRAMES - 1
          ? centre
          : { x: p.x + t * (centre.x - p.x), y: p.y + t * (centre.y - p.y) },
      ),
      closed,
    };
  });
}

/** The frames of unfolding the flower at `centre` back to the sprouts at `open`, closed first. */
export function unfoldFrames(open: readonly Point[], centre: Point): FoldFrame[] {
  return foldFrames(open, centre).reverse();
}
