import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';

/**
 * The colours of an image, as `0xrrggbb`, each once and in reading order: the palette that the
 * Ninja Adventure `Palette.png` swatch holds, read from its RGBA pixels once it is loaded. Pixels
 * that are not fully opaque (the empty cells of the swatch) are left out.
 */
export function imageColours(rgba: ArrayLike<number>): number[] {
  invariant(rgba.length % 4 === 0, `${rgba.length} bytes are not whole RGBA pixels`);
  const colours = new Set<number>();
  for (let at = 0; at < rgba.length; at += 4) {
    if (itemAt(rgba, at + 3) !== 255) continue;
    colours.add((itemAt(rgba, at) << 16) | (itemAt(rgba, at + 1) << 8) | itemAt(rgba, at + 2));
  }
  return [...colours];
}
