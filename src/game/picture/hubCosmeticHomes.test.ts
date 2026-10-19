import { describe, expect, it } from 'vitest';
import { COSMETICS, openCosmetics, type CosmeticId } from '@services/cosmetics';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import { hubCosmeticHomes, type CosmeticHomes } from './hubCosmeticHomes';
import { HUB } from './hubLayout';
import { LILY_POND } from './seasons';

/** Every cosmetic, as teacher mode shows them. */
const ALL = openCosmetics({ stars: 0, seeds: 0 }, true);

/** The sign of the epilogue, centred in the bed. */
const SIGN: Rect = { x: 181, y: CANVAS_HEIGHT - 23, width: 118, height: 15 };

/** Every box the homes take: the animals', the fireflies' and the plants'. */
const boxesOf = (homes: CosmeticHomes): Rect[] => [
  ...homes.critters.map(({ home }) => home),
  ...(homes.fireflies === null ? [] : [homes.fireflies]),
  ...homes.seedlings,
];

describe('the homes of the cosmetics in the hub', () => {
  it('has nothing without stars nor seeds', () => {
    const homes = hubCosmeticHomes([], 0, [], null);
    expect(homes).toEqual({ critters: [], fireflies: null, seedlings: [], lanterns: false });
  });

  it('gives each cosmetic its home once its stars come, the hens two', () => {
    const open = (stars: number): CosmeticId[] => openCosmetics({ stars, seeds: 0 }, false);
    expect(hubCosmeticHomes(open(15), 0, [], null).critters.map(({ id }) => id)).toEqual([
      'butterfly',
    ]);
    expect(hubCosmeticHomes(open(90), 0, [], null).critters.map(({ id }) => id)).toEqual([
      'frog',
      'cat',
      'chickenWhite',
      'chickenBrown',
      'butterfly',
      'butterflyBlue',
    ]);
    expect(hubCosmeticHomes(open(110), 0, [], null).fireflies).not.toBeNull();
    expect(hubCosmeticHomes(open(129), 0, [], null).lanterns).toBe(false);
    expect(hubCosmeticHomes(open(130), 0, [], null).lanterns).toBe(true);
    // A plant for each seed, once the seedlings come.
    expect(hubCosmeticHomes(['seedling'], 3, [], null).seedlings).toHaveLength(3);
    expect(hubCosmeticHomes([], 3, [], null).seedlings).toEqual([]);
  });

  it('keeps every home in the bed, clear of what is taken and of one another', () => {
    for (const taken of [[], [SIGN]]) {
      const homes = hubCosmeticHomes(ALL, 7, taken, null);
      const boxes = boxesOf(homes);
      // Six animals, the fireflies and five plants: everything finds room.
      expect(boxes).toHaveLength(6 + 1 + 5);
      boxes.forEach((box, i) => {
        expect(box.x).toBeGreaterThanOrEqual(HUB.margin);
        expect(box.x + box.width).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
        expect(box.y).toBeGreaterThanOrEqual(HUB.gardenTop);
        expect(box.y + box.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
        for (const other of taken) expect(boxesOverlap(box, other, 0)).toBe(false);
        for (const other of boxes.slice(i + 1)) expect(boxesOverlap(box, other, 0)).toBe(false);
      });
    }
  });

  it('keeps each home where it is as more cosmetics come', () => {
    const full = hubCosmeticHomes(ALL, 7, [SIGN], null);
    for (const { id } of COSMETICS) {
      const few = hubCosmeticHomes([id], 0, [SIGN], null);
      for (const critter of few.critters) {
        expect(full.critters).toContainEqual(critter);
      }
    }
  });

  it('sits the frog on the lily pad of the pond once the pond is planted', () => {
    const pond: Rect = { x: 108, y: HUB.gardenTop, width: LILY_POND.width, height: 48 };
    const frog = hubCosmeticHomes(['frog'], 0, [], pond).critters[0];
    expect(frog?.home).toEqual({ x: 124, y: HUB.gardenTop + 16, width: 16, height: 16 });
    // Without the pond, it lives on the grass of the bed.
    const grass = hubCosmeticHomes(['frog'], 0, [], null).critters[0];
    expect(grass?.home.y).toBe(CANVAS_HEIGHT - 16);
    // A pond whose pad is covered leaves the frog on the grass.
    const covered = hubCosmeticHomes(['frog'], 0, [{ ...pond, width: 48 }], pond).critters[0];
    expect(covered?.home.y).toBe(CANVAS_HEIGHT - 16);
  });

  it('leaves out a cosmetic with no room rather than cover the hub', () => {
    const everywhere: Rect = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    const homes = hubCosmeticHomes(ALL, 7, [everywhere], null);
    expect(boxesOf(homes)).toEqual([]);
    // The lanterns hang by the signposts, not in the bed.
    expect(homes.lanterns).toBe(true);
  });
});
