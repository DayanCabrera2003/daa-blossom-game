import { stepVolume } from '@services/settings';

/** Where a slider's track runs on the canvas, from silence on the left to full on the right. */
export interface SliderTrack {
  readonly x0: number;
  readonly x1: number;
}

/** Where the knob of a slider sits for `volume` (0–1). */
export const knobAt = (volume: number, track: SliderTrack): number =>
  track.x0 + volume * (track.x1 - track.x0);

/**
 * The volume a touch or a drag at `x` asks for: how far along the track it is, kept on the track
 * and on the same tenths the settings keep, so the knob always lands on a step.
 */
export const volumeAt = (x: number, track: SliderTrack): number =>
  stepVolume((x - track.x0) / (track.x1 - track.x0));

/** A volume as the whole percentage shown beside its slider. */
export const volumePercent = (volume: number): number => Math.round(volume * 100);

/** How far the knob's centre is from its left edge, for a knob `width` pixels wide. */
export const grabberCentre = (width: number): number => Math.floor(width / 2);

/** The left edge of a knob `width` pixels wide centred where `volume` puts it, on a whole pixel. */
export const grabberLeft = (volume: number, track: SliderTrack, width: number): number =>
  Math.round(knobAt(volume, track)) - grabberCentre(width);

/** The height of a slider's fill: its rounded top and bottom borders and a line between. */
const FILL_HEIGHT = 7;
/** How far past the knob's centre the fill reaches, so its rounded end hides under the knob. */
const FILL_REACH = 3;

/**
 * The filled part of a slider (the wooden progress bar): from the start of the track to just under
 * the knob, centred on the track's line at `middle`. Null when it would be shorter than `ends`, the
 * width of its two rounded ends, which a shorter bar would squash: silence shows an empty track.
 */
export function sliderFill(
  volume: number,
  track: SliderTrack,
  middle: number,
  ends: number,
): { x: number; y: number; width: number; height: number } | null {
  const width = Math.round(knobAt(volume, track) - track.x0) + FILL_REACH;
  if (width < ends) return null;
  return { x: track.x0, y: middle - Math.floor(FILL_HEIGHT / 2), width, height: FILL_HEIGHT };
}
