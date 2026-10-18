import { describe, expect, it } from 'vitest';
import { GARDEN_DEPTHS, pondDepths } from './gardenDepths';

describe("the order of a garden's layers", () => {
  it('draws the halo under the vines, the lanterns over them, and the sprouts over both', () => {
    const { halo, vine, lantern, sprout, objects } = GARDEN_DEPTHS;
    expect(halo).toBeLessThan(vine);
    expect(vine).toBeLessThan(lantern);
    expect(lantern).toBeLessThan(sprout);
    expect(sprout).toBeLessThan(objects);
  });

  it('covers a doubly lit thread on the garden under its lantern, and the strands over it', () => {
    // Plan 09, phase 2: the dark disc of a thread both sides light hid the garden's lantern.
    const pond = pondDepths(false);
    expect(pond.cover).not.toBeNull();
    expect(pond.cover ?? Infinity).toBeGreaterThan(GARDEN_DEPTHS.vine);
    expect(pond.cover ?? Infinity).toBeGreaterThan(GARDEN_DEPTHS.halo);
    expect(pond.cover ?? Infinity).toBeLessThan(GARDEN_DEPTHS.lantern);
    expect(pond.strands).toBeGreaterThan(GARDEN_DEPTHS.lantern);
    expect(pond.strands).toBeLessThan(GARDEN_DEPTHS.sprout);
  });

  it('lays the water over the whole garden once the pieces drift apart, with no cover', () => {
    const pond = pondDepths(true);
    expect(pond.cover).toBeNull();
    expect(pond.strands).toBeGreaterThan(GARDEN_DEPTHS.objects);
  });
});
