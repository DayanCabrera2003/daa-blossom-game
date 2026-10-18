import { itemAt } from '@core/shared/itemAt';
import type { CosmeticId } from '@services/cosmetics';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import { FIREFLY_BOX } from './fireflies';
import { freeSpot, type Size } from './freeSpot';
import { CRITTER_HOME, CRITTERS, type CritterId } from './hubCritters';
import { HUB } from './hubLayout';
import { LILY_POND } from './seasons';
import { MAX_SEEDLINGS, SEEDLING_BAND, seedlingSpots } from './seedlings';

/**
 * Where each cosmetic of the hub lives (plan 08, section 1.2): every one gets a home in the bed of
 * the hub's garden, clear of what the hub's player reads or presses (`taken`: the top line, the
 * signposts, the flowers' columns, the titles, the buttons, the sign of the epilogue) and of every
 * other home, so no cosmetic ever covers any of them nor another. The animals that walk, and the
 * plants of the seeds, live along the front strip of the bed; the butterflies and the fireflies fly
 * above it; the frog sits on the pond's lily pad once the pond is planted. The homes are found in a
 * fixed order for every cosmetic there could be, then only those there are show, so a home never
 * moves as more come; one with no room is left out. Pure: the scene draws in these homes.
 */

/** Where the butterflies and the fireflies fly: the bed above its front strip. */
const FLY_BAND: Rect = {
  x: HUB.margin,
  y: HUB.gardenTop,
  width: CANVAS_WIDTH - 2 * HUB.margin,
  height: SEEDLING_BAND.y - HUB.gardenTop,
};

/** Where each animal and the fireflies would like to be, as a share of the bed's width. */
const WISH: Readonly<Record<CritterId | 'fireflies', number>> = {
  frog: 0.3,
  cat: 0.9,
  chickenWhite: 0.55,
  chickenBrown: 0.65,
  butterfly: 0.2,
  butterflyBlue: 0.75,
  fireflies: 0.5,
};

/** Which cosmetic brings each animal: the hens come together. */
const BROUGHT_BY: Readonly<Record<CritterId, CosmeticId>> = {
  frog: 'frog',
  cat: 'cat',
  chickenWhite: 'chickens',
  chickenBrown: 'chickens',
  butterfly: 'butterfly',
  butterflyBlue: 'butterflyBlue',
};

/** The lily pad of the pond, where the frog sits. */
const PAD = itemAt(LILY_POND.parts, 1);

/** The homes of the cosmetics a player has. */
export interface CosmeticHomes {
  /** Each animal there is and the box it moves in. */
  readonly critters: readonly { readonly id: CritterId; readonly home: Rect }[];
  /** The box the fireflies drift in, or null without them (or without room). */
  readonly fireflies: Rect | null;
  /** Where each plant of a seed grows, one per seed. */
  readonly seedlings: readonly Rect[];
  /** Whether a lantern is lit by each chapter's signpost. */
  readonly lanterns: boolean;
}

/**
 * The homes of the cosmetics `open` (with `seeds` plants once the seedlings come), clear of
 * `taken`, the frog on the pad of `pond` (the planted pond's box) when it is there and free.
 */
export function hubCosmeticHomes(
  open: readonly CosmeticId[],
  seeds: number,
  taken: readonly Rect[],
  pond: Rect | null,
): CosmeticHomes {
  const blocked: Rect[] = [...taken];
  /** The home of a `size` box in `band` nearest `wish`, kept from every later one. */
  const place = (size: Size, band: Rect, wish: number): Rect | null => {
    const spot = freeSpot(size, band, band.x + wish * band.width - size.width / 2, blocked);
    if (spot !== null) blocked.push(spot);
    return spot;
  };
  const homes = CRITTERS.map((id) => {
    const size = CRITTER_HOME[id];
    if (id === 'frog' && pond !== null) {
      const pad = { x: pond.x + PAD.dx, y: pond.y + PAD.dy, ...size };
      if (blocked.every((box) => !boxesOverlap(pad, box, 1))) {
        blocked.push(pad);
        return { id, home: pad };
      }
    }
    const flies = id === 'butterfly' || id === 'butterflyBlue';
    return { id, home: place(size, flies ? FLY_BAND : SEEDLING_BAND, WISH[id]) };
  });
  const fireflies = place(FIREFLY_BOX, FLY_BAND, WISH.fireflies);
  const seedlings = seedlingSpots(MAX_SEEDLINGS, blocked);
  const has = (id: CosmeticId): boolean => open.includes(id);
  return {
    critters: homes.flatMap(({ id, home }) =>
      home !== null && has(BROUGHT_BY[id]) ? [{ id, home }] : [],
    ),
    fireflies: has('fireflies') ? fireflies : null,
    seedlings: has('seedling') ? seedlings.slice(0, seeds) : [],
    lanterns: has('lanterns'),
  };
}
