import { labelBox } from '@levels/layoutChecks';
import type { Box } from '@levels/plane';
import type { PALETTE } from '../view/palette';
import type { Point } from '../input/target';

/**
 * The outline every sprout's name is written with (plan 09, the decision after phase 0): a vine
 * that leaves a sprout downwards runs through its name, and other vines may pass close by, so the
 * letters get a dark pixel all round them, the name copied once a pixel away in each of the eight
 * directions under the light letters. It reads over any vine, lit or dark, its own sprout's too,
 * without moving a sprout. The layout checks of the levels keep a pixel empty round every name
 * (`PICTURE_SIZES.labelClearance`): the outline fills that pixel and reaches no further.
 */
export const NAME_OUTLINE: {
  /** A colour of `view/palette.ts`: the near-black of the pack, the colour of the night ground. */
  readonly colour: keyof typeof PALETTE;
  /** How far the outline reaches past the letters, in logical pixels. */
  readonly width: number;
  /** Where each copy of the name under the letters is drawn, from the letters' own place. */
  readonly offsets: readonly Point[];
} = {
  colour: 'ink',
  width: 1,
  offsets: [-1, 0, 1].flatMap((y) =>
    [-1, 0, 1].filter((x) => x !== 0 || y !== 0).map((x) => ({ x, y })),
  ),
};

/** The box a sprout's name covers with its outline: the letters' box grown by the outline. */
export function outlinedNameBox(sprout: { label: string; x: number; y: number }): Box {
  const box = labelBox(sprout);
  const { width } = NAME_OUTLINE;
  return {
    left: box.left - width,
    top: box.top - width,
    right: box.right + width,
    bottom: box.bottom + width,
  };
}
