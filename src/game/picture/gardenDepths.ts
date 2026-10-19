/**
 * The depths of the layers of a level's garden, lowest first, as data so their order is tested:
 * the lanterns' halo under the vines, the lanterns over them, the sprouts over both, and the
 * stones and scarecrows over the sprouts. The reflection in the pond (chapter 2) goes between
 * them: the dark cover of a thread both sides light over that thread's vine and under its lantern,
 * which stays in sight (plan 09, phase 2); the strands over the lanterns and under the sprouts; and
 * once the pieces drift apart, the water over the whole garden. The trail of the chain the light
 * found (plan 10, phase 2) goes over the vines and under the lanterns.
 */
export const GARDEN_DEPTHS = {
  halo: 19,
  vine: 20,
  pondCover: 21,
  foundTrail: 21.5,
  lantern: 22,
  pondOnGarden: 25,
  sprout: 30,
  objects: 35,
  pondOnWater: 36,
} as const;

/** Where the pond's pieces go: the cover of doubly lit threads (none on the water), the strands. */
export interface PondDepths {
  readonly cover: number | null;
  readonly strands: number;
}

/** The depths of the pond's pieces while the tangle lies on the garden, or once `separated`. */
export function pondDepths(separated: boolean): PondDepths {
  return separated
    ? { cover: null, strands: GARDEN_DEPTHS.pondOnWater }
    : { cover: GARDEN_DEPTHS.pondCover, strands: GARDEN_DEPTHS.pondOnGarden };
}
