/**
 * How loud the music plays over time (plan 06, phase 9): a new track rises as the old one falls
 * over an 800 ms crossfade, and the music ducks under a jingle and comes back once it ends. Pure:
 * the music player reads these levels every frame and hands them to the audio bus, which scales
 * them by the music channel's gain.
 */

/** How long a crossfade lasts, in milliseconds. */
export const CROSSFADE_MS = 800;
/** How loud the music stays under a jingle, relative to full. */
export const DUCK_LEVEL = 0.3;
/** How long the music takes to go down as a jingle starts. */
export const DUCK_MS = 150;
/** How long the music takes to come back once the jingle ends. */
export const UNDUCK_MS = 600;

/** Keeps `value` between 0 and 1. */
const unit = (value: number): number => Math.min(1, Math.max(0, value));

/** When a track started, and when another replaced it (null while it is still the one playing). */
export interface TrackSpan {
  readonly start: number;
  readonly end: number | null;
}

/**
 * A track's own level at `now`: rising over the crossfade from its start and, once replaced,
 * falling over the crossfade from then. A track replaced while still rising falls from where it
 * had got to, never rising further.
 */
export function trackLevel(span: TrackSpan, now: number): number {
  const rise = (at: number): number => unit((at - span.start) / CROSSFADE_MS);
  if (span.end === null) return rise(now);
  return rise(Math.min(now, span.end)) * unit(1 - (now - span.end) / CROSSFADE_MS);
}

/** Whether a replaced track has faded out for good, so it can be stopped. */
export const trackFaded = (span: TrackSpan, now: number): boolean =>
  span.end !== null && now - span.end >= CROSSFADE_MS;

/** When the music started going down under a jingle, and when the jingle ended (null: sounding). */
export interface DuckSpan {
  readonly start: number;
  readonly end: number | null;
}

/** The level of the music going down from a duck's start, before its jingle ends. */
const goingDown = (start: number, now: number): number =>
  1 - (1 - DUCK_LEVEL) * unit((now - start) / DUCK_MS);

/**
 * The music's level under the jingles at `now`: full with none; going down to the duck level as
 * one starts; and, once it ends, coming back up to full from wherever it had got to.
 */
export function duckLevel(duck: DuckSpan | null, now: number): number {
  if (duck === null) return 1;
  if (duck.end === null) return goingDown(duck.start, now);
  const reached = goingDown(duck.start, duck.end);
  return reached + (1 - reached) * unit((now - duck.end) / UNDUCK_MS);
}

/**
 * The duck of a jingle starting at `now`, over the duck `previous` still under way (or null): it
 * goes on down from the level the music is at, with no jump.
 */
export function startDuck(previous: DuckSpan | null, now: number): DuckSpan {
  const level = duckLevel(previous, now);
  // The start that puts a fresh descent at `level` right now.
  const start = now - ((1 - level) / (1 - DUCK_LEVEL)) * DUCK_MS;
  return { start, end: null };
}
