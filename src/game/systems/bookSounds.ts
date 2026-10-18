import { itemAt } from '@core/shared/itemAt';
import type { BusSound } from '@services/busEvents';
import type { AssetKey } from '../assets/keys';

/** The page turns, taken in turn like the notebook's so two in a row do not sound alike. */
const FLIPS = ['sfx.bookFlip1', 'sfx.bookFlip2', 'sfx.bookFlip3'] as const satisfies AssetKey[];

/** The effect each named sound of the books plays; a page turn is chosen in turn. */
const FIXED = {
  bookOpen: 'sfx.bookOpen',
  bookClose: 'sfx.bookClose',
  click: 'sfx.button',
} as const satisfies Record<Exclude<BusSound, 'bookFlip'>, AssetKey>;

/**
 * Turns the sounds the DOM books ask for on the bus into effects of the asset manifest. The books
 * name sounds, never asset keys, so they stay apart from the game; each call to `bookSounds` keeps
 * its own count of page turns.
 */
export function bookSounds(): (sound: BusSound) => AssetKey {
  let flips = 0;
  return (sound) => {
    if (sound !== 'bookFlip') return FIXED[sound];
    const key = itemAt(FLIPS, flips % FLIPS.length);
    flips += 1;
    return key;
  };
}
