import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';

/** The red, green and blue channels of a `0xrrggbb` colour. */
const channels = (colour: number): readonly [number, number, number] => [
  (colour >> 16) & 0xff,
  (colour >> 8) & 0xff,
  colour & 0xff,
];

/**
 * How far apart two `0xrrggbb` colours are: the squared distance between their red, green and
 * blue channels. Squared, because only the order matters when picking the nearest.
 */
export function colourDistance(a: number, b: number): number {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2;
}

/**
 * The colour of `palette` nearest to `colour` (plan 06, section 1.1: the Kenney sheets are mapped
 * onto the Ninja Adventure palette when they load). A colour already in the palette is its own
 * nearest; between two at the same distance the first in the palette wins, so the answer never
 * depends on anything but the palette's order.
 */
export function nearestColour(colour: number, palette: readonly number[]): number {
  invariant(palette.length > 0, 'cannot pick the nearest colour of an empty palette');
  let nearest = itemAt(palette, 0);
  let best = colourDistance(colour, nearest);
  for (const candidate of palette) {
    const distance = colourDistance(colour, candidate);
    if (distance < best) {
      nearest = candidate;
      best = distance;
    }
  }
  return nearest;
}
