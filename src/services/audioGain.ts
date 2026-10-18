import type { AudioChannel, Settings } from './settings';

/**
 * How loud a whole channel plays: its volume in the settings, or silence when the player muted
 * everything or the tab is hidden (nothing should sound from a tab nobody is looking at). The
 * audio bus applies this to every sound of the channel each time the settings or the tab change.
 */
export const channelGain = (settings: Settings, channel: AudioChannel, hidden: boolean): number =>
  settings.muted || hidden ? 0 : settings[channel];

/** A volume held between 0 and 1; one that is not a number is silence. */
const held = (volume: number): number =>
  Number.isNaN(volume) ? 0 : Math.min(1, Math.max(0, volume));

/**
 * How loud one sound plays: its channel's gain times the sound's own volume (a quieter replay, a
 * jingle under the music), the latter kept between 0 and 1 so no sound ever rises above its channel.
 * A gain or volume that is not a number plays nothing, never reaching the audio API as NaN.
 */
export const soundGain = (gain: number, own: number): number =>
  Number.isNaN(gain) ? 0 : gain * held(own);
