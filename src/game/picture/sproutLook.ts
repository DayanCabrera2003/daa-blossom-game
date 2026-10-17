import type { SproutPicture } from './garden';

/**
 * How a sprout looks at one instant (plan 06, section 1.4): its little face, asleep in the dark
 * (eyes shut, a sad mouth) and happy with a lantern (eyes open, a smile), which species it is, and
 * whether its open eyes are shut by a blink just now. Blinks come once a period, at a moment of
 * the period that differs from sprout to sprout, so a garden never blinks all at once.
 */

/** The face a sprout wears: asleep in the dark, happy with a lantern. */
export type SproutFace = 'asleep' | 'happy';

/** What is drawn on top of the round body: a sprout's leaves, a bee's wings, a flower's petals. */
export type SproutSpecies = 'sprout' | 'bee' | 'flower';

/** A sprout as drawn at one instant. */
export interface SproutLook {
  readonly face: SproutFace;
  readonly species: SproutSpecies;
  /** Whether its open eyes are shut by a blink at this instant; never for a sleeping sprout. */
  readonly blinking: boolean;
}

/** Every how long a sprout blinks, and how long its eyes stay shut, in milliseconds. */
export const BLINK_PERIOD_MS = 4200;
export const BLINK_MS = 140;

/**
 * Where in the period a sprout blinks: a step that is prime to the period spreads the sprouts of a
 * garden over it, so neighbours (consecutive ids) never blink together.
 */
const BLINK_STEP_MS = 1297;
const blinkPhase = (vertex: number): number => (vertex * BLINK_STEP_MS) % BLINK_PERIOD_MS;

/** The look of `sprout` at the instant `now` (milliseconds of the scene's clock). */
export function sproutLook(sprout: SproutPicture, now: number): SproutLook {
  const face: SproutFace = sprout.lit ? 'happy' : 'asleep';
  const inPeriod =
    (((now - blinkPhase(sprout.vertex)) % BLINK_PERIOD_MS) + BLINK_PERIOD_MS) % BLINK_PERIOD_MS;
  return {
    face,
    species: sprout.kind ?? 'sprout',
    blinking: face === 'happy' && inPeriod < BLINK_MS,
  };
}
