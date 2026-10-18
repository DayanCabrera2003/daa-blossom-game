/**
 * The limits of a garden of the free mode (plan 08, section 1.3), held by the editor's reducer, by
 * every import and by the generators, so a garden designed, shared or grown stays readable on the
 * 480×270 canvas and quick for the mechanical gardener.
 */

/** The most sprouts a design holds (7.5, the largest level, has 22). */
export const MAX_SPROUTS = 24;

/** The most vines a design holds. */
export const MAX_VINES = 40;

/** The least distance between two sprouts, in pixels: twice a sprout's radius, and some air. */
export const MIN_SPACING = 18;
