import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';

/**
 * Recolouring a pack sprite by swapping its few colours for others of the palette (plan 06,
 * section 1.4: "recoloreado a ámbar", never redrawn): the red lantern of Ninja Adventure becomes
 * the game's amber lantern, or a silver one in the pond's reflection, and the light water of the
 * ripples takes the pond's deep water. Each table lists the colours it changes; any other colour,
 * like the black outline, stays.
 */

/** A table of swaps, from a colour of the sprite to the one that replaces it (0xRRGGBB). */
export type ColourSwaps = ReadonlyMap<number, number>;

/** The red paper lantern, turned amber: its body the lantern's colour, its stripes deeper. */
export const AMBER_LANTERN: ColourSwaps = new Map([
  [0xe0394c, 0xef914f],
  [0x8f3e56, 0xd78b4a],
]);

/** The same lantern in the pond's reflection, silvery blue (GDD §4.1). */
export const SILVER_LANTERN: ColourSwaps = new Map([
  [0xe0394c, 0xb8dce5],
  [0x8f3e56, 0x79b8ce],
]);

/** The ripples of Ninja Adventure on the deep water of the pond. */
export const POND_RIPPLES: ColourSwaps = new Map([
  [0x71ddee, 0x2d697b],
  [0x79b8ce, 0x548789],
]);

/**
 * An image's RGBA pixels with each colour of `swaps` replaced, keeping the alpha. Fully
 * transparent pixels stay exactly as they were, and the answer is a new array.
 */
export function swapColours(rgba: ArrayLike<number>, swaps: ColourSwaps): Uint8ClampedArray {
  invariant(rgba.length % 4 === 0, `${rgba.length} bytes are not whole RGBA pixels`);
  const out = Uint8ClampedArray.from(rgba);
  for (let at = 0; at < out.length; at += 4) {
    if (itemAt(out, at + 3) === 0) continue;
    const colour = (itemAt(out, at) << 16) | (itemAt(out, at + 1) << 8) | itemAt(out, at + 2);
    const swap = swaps.get(colour);
    if (swap === undefined) continue;
    out[at] = (swap >> 16) & 0xff;
    out[at + 1] = (swap >> 8) & 0xff;
    out[at + 2] = swap & 0xff;
  }
  return out;
}
