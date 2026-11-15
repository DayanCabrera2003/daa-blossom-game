import type { StarResult } from './stars';

/**
 * The victory panel waits for the last move to finish playing (GDD §4.1, «Carteles sobre el
 * jardín»): the winning chain lights its lanterns and bursts first, then the panel shows, so it
 * never falls on what was just lit. Pure: the presenter holds the win and asks every frame.
 */

/** The stars of a win waiting for the animation to end, or null when none waits. */
export type HeldVictory = StarResult | null;

/** No win waiting. */
export const NO_VICTORY_HELD: HeldVictory = null;

/** What waits now, and the stars whose panel shows this frame, if any. */
export interface VictoryTurn {
  readonly held: HeldVictory;
  readonly show: StarResult | null;
}

/** A win with `stars` comes while an animation is `playing` or not: held, or shown at once. */
export const holdVictory = (stars: StarResult, playing: boolean): VictoryTurn =>
  playing ? { held: stars, show: null } : { held: NO_VICTORY_HELD, show: stars };

/** A frame with `held` waiting and an animation `playing` or not: the panel shows once it ends. */
export const releaseVictory = (held: HeldVictory, playing: boolean): VictoryTurn =>
  held === null || playing ? { held, show: null } : { held: NO_VICTORY_HELD, show: held };
