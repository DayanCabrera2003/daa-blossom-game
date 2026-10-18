import type { Point } from '../input/target';
import type { Rect } from './boxDistance';

/**
 * The small mark on a panel's frame that tells it can be dragged (the post-release fix of plan 09):
 * two rows of three dots, like the grip of a drawer, on the top border of the wood. Pure: where
 * each dot goes; the panel's view paints them.
 */
export const GRIP_MARK = {
  /** From one dot to the next, across and down. */
  spacing: 2,
  /** From the panel's top edge to the mark's middle, inside the border of the wood. */
  inset: 3,
} as const;

/** Where the mark of a panel covering `frame` goes: on its top border, across its middle. */
export const gripMarkCentre = (frame: Rect): Point => ({
  x: Math.round(frame.x + frame.width / 2),
  y: frame.y + GRIP_MARK.inset,
});

/** The dots of the mark centred at `centre`, each a pixel. */
export function gripMark(centre: Point): Rect[] {
  const { spacing } = GRIP_MARK;
  return [-1, 0, 1].flatMap((column) =>
    [-0.5, 0.5].map((row) => ({
      x: centre.x + column * spacing,
      y: Math.round(centre.y + row * spacing),
      width: 1,
      height: 1,
    })),
  );
}
