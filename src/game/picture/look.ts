import type { PALETTE } from '../view/palette';

/**
 * The numbers of the look that are tuned by eye (plan 09, phase 2), gathered in one table so a
 * change is a number here and not a function elsewhere: the night fog's clouds, the lanterns'
 * halo, where a scarecrow stands, how long the spark of a new lantern and the fall of a stone
 * take, and the conflict's blinking. The lengths of the animation's steps already have their own
 * table (`animation/plan.ts`). Every number has its allowed range in `LOOK_RANGES`, which the tests
 * hold it to; a row of numbers (the halo's three frames) keeps each of them in its range.
 */
export const LOOK = {
  /** How much the pack's clouds show over the fog's veil (chapter 3), from 0 to 1. */
  fogCloudAlpha: 0.16,
  /** How fast the clouds drift across the veil, in logical pixels per millisecond. */
  fogDrift: 0.004,
  /**
   * The lantern's halo in its three frames of flicker, a breath in and out (small, large, middle;
   * `lanternFlicker.ts`): the radius in logical pixels and the opacity of its warm inner ring and
   * of its wide faint outer one.
   */
  haloInnerRadius: [8, 9, 8],
  haloInnerAlpha: [0.5, 0.58, 0.54],
  haloOuterRadius: [12, 14, 13],
  haloOuterAlpha: [0.22, 0.28, 0.25],
  /** The air between a sprout's body and the scarecrow beside it, in logical pixels. */
  scarecrowGap: 5,
  /** How long the spark and the petals over a new lantern last, in milliseconds. */
  burstMs: 900,
  /** How long a stone takes to fall onto its sprout, and to settle there, in milliseconds. */
  stoneFallMs: 70,
  stoneSettleMs: 110,
  /** How many times the conflict turns from sun to moon, and how much it fades by its end. */
  conflictBlinks: 3,
  conflictFade: 0.6,
} as const;

/** The smallest and largest value each number of the look may take. */
export const LOOK_RANGES: Readonly<Record<keyof typeof LOOK, readonly [number, number]>> = {
  fogCloudAlpha: [0.05, 0.4],
  fogDrift: [0, 0.02],
  haloInnerRadius: [4, 16],
  haloInnerAlpha: [0.2, 0.9],
  haloOuterRadius: [6, 24],
  haloOuterAlpha: [0.05, 0.6],
  scarecrowGap: [2, 10],
  burstMs: [300, 2000],
  stoneFallMs: [30, 300],
  stoneSettleMs: [50, 400],
  conflictBlinks: [1, 6],
  conflictFade: [0, 1],
};

/** A colour of `view/palette.ts`, by name. */
type Tone = keyof typeof PALETTE;

/**
 * The colours of the look tuned by eye: each halo's inner ring then its outer one, the player's
 * amber lantern and the pond's silvery one; and the two the conflict blinks between, the sun's gold
 * and the moon's blue (a curiosity, never an error: no red).
 */
export const LOOK_TONES: {
  readonly haloAmber: readonly [Tone, Tone];
  readonly haloSilver: readonly [Tone, Tone];
  readonly conflictSun: Tone;
  readonly conflictMoon: Tone;
} = {
  haloAmber: ['lit', 'litGlow'],
  haloSilver: ['moon', 'mirror'],
  conflictSun: 'sun',
  conflictMoon: 'moon',
};
