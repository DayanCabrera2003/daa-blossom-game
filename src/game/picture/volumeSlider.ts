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
