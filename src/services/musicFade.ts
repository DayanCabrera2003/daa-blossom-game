/**
 * How loud the music plays over time (plan 06, phase 9): a new track rises as the old one falls
 * over a crossfade, and the music ducks under a jingle and comes back once it ends. Pure: the music
 * player reads these levels every frame and hands them to the audio bus, which scales them by the
 * music channel's gain. How long each fade lasts and how far the music ducks are numbers of the
 * mix (`game/audio/mix.ts`, plan 09, phase 8), handed in as `fade`.
 */

/** How the music fades: the crossfade of two tracks and its duck under a jingle. */
export interface MusicFade {
  /** How long a crossfade of two tracks lasts, in ms. */
  readonly crossfadeMs: number;
  /** How loud the music stays under a jingle, relative to full (below 1). */
  readonly duckLevel: number;
  /** How long the music takes to go down as a jingle starts, in ms. */
  readonly duckMs: number;
  /** How long it takes to come back once the jingle ends, in ms. */
  readonly unduckMs: number;
}

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
export function trackLevel(span: TrackSpan, now: number, fade: MusicFade): number {
  const rise = (at: number): number => unit((at - span.start) / fade.crossfadeMs);
  if (span.end === null) return rise(now);
  return rise(Math.min(now, span.end)) * unit(1 - (now - span.end) / fade.crossfadeMs);
}

/** Whether a replaced track has faded out for good, so it can be stopped. */
export const trackFaded = (span: TrackSpan, now: number, fade: MusicFade): boolean =>
  span.end !== null && now - span.end >= fade.crossfadeMs;

/** When the music started going down under a jingle, and when the jingle ended (null: sounding). */
export interface DuckSpan {
  readonly start: number;
  readonly end: number | null;
}

/** The level of the music going down from a duck's start, before its jingle ends. */
const goingDown = (start: number, now: number, fade: MusicFade): number =>
  1 - (1 - fade.duckLevel) * unit((now - start) / fade.duckMs);

/**
 * The music's level under the jingles at `now`: full with none; going down to the duck level as
 * one starts; and, once it ends, coming back up to full from wherever it had got to.
 */
export function duckLevel(duck: DuckSpan | null, now: number, fade: MusicFade): number {
  if (duck === null) return 1;
  if (duck.end === null) return goingDown(duck.start, now, fade);
  const reached = goingDown(duck.start, duck.end, fade);
  return reached + (1 - reached) * unit((now - duck.end) / fade.unduckMs);
}

/**
 * The duck of a jingle starting at `now`, over the duck `previous` still under way (or null): it
 * goes on down from the level the music is at, with no jump.
 */
export function startDuck(previous: DuckSpan | null, now: number, fade: MusicFade): DuckSpan {
  const level = duckLevel(previous, now, fade);
  // The start that puts a fresh descent at `level` right now.
  const start = now - ((1 - level) / (1 - fade.duckLevel)) * fade.duckMs;
  return { start, end: null };
}
