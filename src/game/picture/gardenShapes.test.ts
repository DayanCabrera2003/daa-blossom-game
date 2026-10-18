import { describe, expect, it } from 'vitest';
import { invariant } from '@core/shared/invariant';
import { POND_SPROUTS, pondLevel } from '../../../tests/support/pondGarden';
import { totalCoverage } from './coverage';
import { gardenPicture, NO_EXTRAS } from './garden';
import { gardenShapes, sproutShapes, strandShapes } from './gardenShapes';
import { tanglePicture } from './tangle';

const level = pondLevel();
const positions = POND_SPROUTS.map(({ x, y }) => ({ x, y }));
const labels = POND_SPROUTS.map(({ label }) => label);
const picture = gardenPicture(level.start, positions, labels, NO_EXTRAS);
const mirror = level.mirror;
invariant(mirror !== null, 'the pond garden has a reflection');

/** The tangle of the pond garden, separated or not. */
const tangle = (separated: boolean) =>
  tanglePicture(level.start.matching, mirror, positions, labels, { separated, touched: null });

describe('the pieces of the garden a panel should keep clear of', () => {
  it('a sprout: its body with its crown, and its name under it', () => {
    const [body, name] = sproutShapes({ x: 100, y: 100, label: 'a', kind: null });
    expect(body).toEqual({ kind: 'box', box: { x: 92, y: 89, width: 16, height: 19 } });
    invariant(name?.kind === 'box', 'a name is a box');
    // Under the body, centred on the sprout.
    expect(name.box.y).toBeGreaterThan(100 + 7);
    expect(name.box.x + name.box.width / 2).toBe(100);
  });

  it('a flower reaches further than a plain sprout', () => {
    const [flower] = sproutShapes({ x: 0, y: 0, label: 'f', kind: 'flower' });
    const [plain] = sproutShapes({ x: 0, y: 0, label: 'f', kind: null });
    invariant(flower?.kind === 'box' && plain?.kind === 'box', 'bodies are boxes');
    expect(flower.box.width).toBeGreaterThan(plain.box.width);
  });

  it('every sprout, every vine shown and the lantern of every lit vine', () => {
    const shapes = gardenShapes(picture, null);
    // Twelve sprouts (body and name), ten vines, five lanterns.
    expect(shapes).toHaveLength(12 * 2 + 10 + 5);
    // The middle of the vine 1–2 is covered; empty sky is not.
    expect(totalCoverage({ x: 65, y: 65, width: 10, height: 10 }, shapes)).toBeGreaterThan(0);
    expect(totalCoverage({ x: 420, y: 200, width: 20, height: 20 }, shapes)).toBe(0);
  });

  it('a vine hidden by the fog is not drawn, so it is not a piece to keep clear of', () => {
    const fogged = { ...level.start, revealed: positions.map(() => false) };
    const shapes = gardenShapes(gardenPicture(fogged, positions, labels, NO_EXTRAS), null);
    expect(shapes).toHaveLength(12 * 2);
  });

  it('a reflection not yet separated adds its strands and lanterns over the garden', () => {
    expect(gardenShapes(picture, tangle(false)).length).toBeGreaterThan(
      gardenShapes(picture, null).length,
    );
  });

  it('once the tangle separates, the garden is under the water and the drifted pieces show', () => {
    const pond = tangle(true);
    const shapes = gardenShapes(picture, pond);
    // The ten sprouts of the thread and the loop, their nine strands with their lanterns, and the
    // pair both sides light, which stays where it was.
    expect(shapes).toHaveLength(10 * 2 + 9 * 2 + 2);
    expect(strandShapes(pond, () => true)).toEqual(shapes);
    // Only the thread through 1: six sprouts and five strands.
    expect(strandShapes(pond, (piece) => piece === 0)).toHaveLength(6 * 2 + 5 * 2);
  });

  it('a reflection that has dissolved shows the garden again', () => {
    const pond = { ...tangle(true), dissolved: true };
    expect(gardenShapes(picture, pond)).toEqual(gardenShapes(picture, null));
  });
});
