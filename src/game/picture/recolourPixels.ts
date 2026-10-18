import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import { nearestColour } from './nearestColour';

/**
 * An image's RGBA pixels with each colour moved to its nearest in `palette` (plan 06, section 1.1:
 * the Kenney sheets take the Ninja Adventure palette when they load). Alpha is kept, and fully
 * transparent pixels stay exactly as they were. The given bytes are not changed; the answer is a
 * new array. Sheets repeat few colours, so each distinct colour is matched only once.
 */
export function recolourPixels(
  rgba: ArrayLike<number>,
  palette: readonly number[],
): Uint8ClampedArray {
  invariant(rgba.length % 4 === 0, `${rgba.length} bytes are not whole RGBA pixels`);
  const out = Uint8ClampedArray.from(rgba);
  const matched = new Map<number, number>();
  for (let at = 0; at < out.length; at += 4) {
    if (itemAt(out, at + 3) === 0) continue;
    const colour = (itemAt(out, at) << 16) | (itemAt(out, at + 1) << 8) | itemAt(out, at + 2);
    let nearest = matched.get(colour);
    if (nearest === undefined) {
      nearest = nearestColour(colour, palette);
      matched.set(colour, nearest);
    }
    out[at] = (nearest >> 16) & 0xff;
    out[at + 1] = (nearest >> 8) & 0xff;
    out[at + 2] = nearest & 0xff;
  }
  return out;
}
