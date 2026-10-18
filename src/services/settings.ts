import { z } from 'zod';
import type { KeyValueStore } from './save';

/** Where the player's settings are kept in the browser, apart from the progress. */
export const SETTINGS_KEY = 'florecer.settings';

const SETTINGS_VERSION = 1 as const;

/** The audio channels, each with its own volume: music, sound effects and the voices' babble. */
export const AUDIO_CHANNELS = ['music', 'sfx', 'voice'] as const;

/** One audio channel. */
export type AudioChannel = (typeof AUDIO_CHANNELS)[number];

/** How fine a volume is: the sliders move in tenths. */
const STEPS = 10;

/**
 * A volume kept between 0 and 1 and rounded to its nearest tenth, so a slider shows exactly what
 * is stored. Anything that is not a number is silence.
 */
export const stepVolume = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.round(Math.min(1, Math.max(0, value)) * STEPS) / STEPS;

/** A stored volume: out of range is damage; between steps is rounded onto its step. */
const volume = z.number().min(0).max(1).transform(stepVolume);

const settingsSchema = z.strictObject({
  version: z.literal(SETTINGS_VERSION),
  music: volume,
  sfx: volume,
  voice: volume,
  /** Silences every channel at once, keeping their volumes for when it is lifted. */
  muted: z.boolean(),
});

/** The player's settings: the volume of each audio channel, and whether everything is muted. */
export type Settings = z.infer<typeof settingsSchema>;

/** The settings of a new player: music in the background, effects and voices clearer. */
export const defaultSettings = (): Settings => ({
  version: SETTINGS_VERSION,
  music: 0.5,
  sfx: 0.8,
  voice: 0.8,
  muted: false,
});

/**
 * Reads the settings. Anything unreadable (none yet, damaged JSON, another version, storage
 * refused) gives the defaults: the game always starts, at worst with the volumes it ships with.
 */
export function loadSettings(store: KeyValueStore): Settings {
  try {
    const raw = store.getItem(SETTINGS_KEY);
    if (raw === null) return defaultSettings();
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

/** Writes the settings; if the browser refuses, they last only for this session. */
export function writeSettings(store: KeyValueStore, settings: Settings): void {
  try {
    store.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage refused (private mode, quota): the settings live only for this session.
  }
}

/** The settings with the volume of `channel` set to `value`, kept in range and on its step. */
export const setVolume = (settings: Settings, channel: AudioChannel, value: number): Settings => ({
  ...settings,
  [channel]: stepVolume(value),
});

/** The settings with the volume of `channel` one step (a tenth) down or up: an arrow on its slider. */
export const nudgeVolume = (
  settings: Settings,
  channel: AudioChannel,
  direction: -1 | 1,
): Settings => setVolume(settings, channel, settings[channel] + direction / STEPS);

/** The settings with mute switched over; the volumes stay as they were. */
export const toggleMute = (settings: Settings): Settings => ({
  ...settings,
  muted: !settings.muted,
});
