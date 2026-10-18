import { describe, expect, it } from 'vitest';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { boxesOverlap, type Rect } from '../src/game/picture/boxDistance';
import { hubCosmeticHomes, type CosmeticHomes } from '../src/game/picture/hubCosmeticHomes';
import { hubGarden } from '../src/game/picture/hubGarden';
import { epilogueSignAt } from '../src/game/picture/hubLayout';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import { FLICKER_FRAME_MS } from '../src/game/picture/lanternFlicker';
import { glowBox, signpostGlow } from '../src/game/picture/signpostGlow';
import { openCosmetics } from '../src/services/cosmetics';
import { hubOf, t } from './support/hubBoxes';

// The cosmetics of the hub find their homes in the hub as the scene lays it out with the real
// catalog and words (plan 08, phase 7): with every cosmetic and seven seeds, in both modes, with
// and without the sign of the epilogue, and for every set of chapters finished (which plants the
// pond, and so moves the frog), no home covers the top line, a signpost, a flower's column, a
// title or a button, nor another home, and every cosmetic finds room. The lanterns' glow stays
// on each signpost, off the flower's column beside it and the title after it.

/** Every cosmetic, as 134 stars and seven seeds bring them. */
const ALL = openCosmetics({ stars: 134, seeds: 7 }, false);

/** Every set of chapters 0 to 7 that can be finished. */
const FINISHED = Array.from(
  { length: 256 },
  (_, bits) => new Set([...'01234567'].filter((_, c) => (bits >> c) % 2 === 1)),
);

/** The hub's boxes, the flowers' columns and signposts among them, and the epilogue's sign. */
function takenOf(teacherMode: boolean, epilogue: boolean): Rect[] {
  const { boxes, signs } = hubOf(teacherMode);
  const taken = [...boxes, ...[...signs.values()].flatMap(({ cell, sign }) => [cell, sign])];
  if (epilogue) {
    const width = estimatedButtonWidth(t('epilogue.title'));
    const at = epilogueSignAt(width, BUTTON_HEIGHT);
    taken.push({ x: at.x, y: at.y - 1, width, height: BUTTON_HEIGHT });
  }
  return taken;
}

/** Every box the homes take. */
const boxesOf = (homes: CosmeticHomes): Rect[] => [
  ...homes.critters.map(({ home }) => home),
  ...(homes.fireflies === null ? [] : [homes.fireflies]),
  ...homes.seedlings,
];

describe('the cosmetics in the hub as it is laid out', () => {
  it('brings every cosmetic with the most stars and seeds of the game', () => {
    expect(ALL).toEqual([
      'butterfly',
      'frog',
      'cat',
      'butterflyBlue',
      'chickens',
      'fireflies',
      'lanterns',
      'seedling',
    ]);
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    'never covers the hub nor one another, whatever is finished (teacher: %s, epilogue: %s)',
    (teacherMode, epilogue) => {
      const taken = takenOf(teacherMode, epilogue);
      // The chapters finished matter to the cosmetics only by where the pond is, if anywhere:
      // each pond seen is checked once.
      const ponds = new Map(
        FINISHED.map((finished) => {
          const pond = hubGarden(finished, taken).find(({ chapter }) => chapter === '2');
          return [pond === undefined ? '' : `${pond.x},${pond.y}`, pond];
        }),
      );
      expect(ponds.size).toBe(2);
      for (const pond of ponds.values()) {
        const homes = hubCosmeticHomes(
          ALL,
          7,
          taken,
          pond === undefined
            ? null
            : { x: pond.x, y: pond.y, width: pond.ornament.width, height: pond.ornament.height },
        );
        const boxes = boxesOf(homes);
        // Six animals, the fireflies and seven plants.
        expect(boxes).toHaveLength(14);
        boxes.forEach((box, i) => {
          for (const other of taken) expect(boxesOverlap(box, other, 0)).toBe(false);
          for (const other of boxes.slice(i + 1)) expect(boxesOverlap(box, other, 0)).toBe(false);
        });
        // The frog sits in the pond once it is planted.
        const frog = homes.critters.find(({ id }) => id === 'frog')?.home;
        if (pond !== undefined) {
          // On its lily pad, a tile in from the pond's corner.
          expect(frog).toEqual({ x: pond.x + 16, y: pond.y + 16, width: 16, height: 16 });
        }
      }
    },
  );
});

describe('the lanterns on the signposts as the hub is laid out', () => {
  it.each([false, true])(
    'light only their own signpost, never a flower, a title or a button (teacher: %s)',
    (teacherMode) => {
      const { boxes, signs } = hubOf(teacherMode);
      const cells = [...signs.values()].map(({ cell }) => cell);
      [...signs.values()].forEach(({ sign }, index) => {
        for (const frame of [0, 1, 2]) {
          const box = glowBox(signpostGlow(sign, frame * FLICKER_FRAME_MS, index));
          expect(box.x).toBeGreaterThanOrEqual(sign.x);
          expect(box.y).toBeGreaterThanOrEqual(sign.y);
          expect(box.x + box.width).toBeLessThanOrEqual(sign.x + sign.width);
          expect(box.y + box.height).toBeLessThanOrEqual(sign.y + sign.height);
          for (const other of [...boxes, ...cells]) {
            expect(boxesOverlap(box, other, 0)).toBe(false);
          }
        }
      });
    },
  );
});
