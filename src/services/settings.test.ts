import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_CHANNELS,
  defaultSettings,
  loadSettings,
  setVolume,
  SETTINGS_KEY,
  stepVolume,
  toggleMute,
  writeSettings,
} from './settings';
import { memoryStore } from '../../tests/support/memoryStore';

describe('the player settings', () => {
  it('a new player hears music at half and effects and voices at 0.8, not muted', () => {
    expect(defaultSettings()).toEqual({
      version: 1,
      music: 0.5,
      sfx: 0.8,
      voice: 0.8,
      muted: false,
    });
    expect(loadSettings(memoryStore())).toEqual(defaultSettings());
  });

  it('there is one volume for the music, one for the effects and one for the voices', () => {
    expect(AUDIO_CHANNELS).toEqual(['music', 'sfx', 'voice']);
  });

  it('what is written comes back, under its own key', () => {
    const store = memoryStore();
    const settings = toggleMute(setVolume(defaultSettings(), 'voice', 0.3));
    writeSettings(store, settings);
    expect(store.data.has(SETTINGS_KEY)).toBe(true);
    expect(SETTINGS_KEY).toBe('florecer.settings');
    expect(loadSettings(store)).toEqual(settings);
  });

  it('a volume is kept between 0 and 1, in steps of 0.1', () => {
    expect(stepVolume(-0.4)).toBe(0);
    expect(stepVolume(1.7)).toBe(1);
    expect(stepVolume(0.34)).toBe(0.3);
    expect(stepVolume(0.36)).toBe(0.4);
    expect(stepVolume(Number.NaN)).toBe(0);
    fc.assert(
      fc.property(fc.double(), (value) => {
        const stepped = stepVolume(value);
        expect(stepped).toBeGreaterThanOrEqual(0);
        expect(stepped).toBeLessThanOrEqual(1);
        expect(Math.round(stepped * 10) / 10).toBe(stepped);
      }),
    );
  });

  it('setting a volume changes only its channel, kept in range', () => {
    const louder = setVolume(defaultSettings(), 'music', 3);
    expect(louder).toEqual({ ...defaultSettings(), music: 1 });
    expect(setVolume(defaultSettings(), 'sfx', -1).sfx).toBe(0);
  });

  it('mute switches on and off, keeping the volumes', () => {
    const muted = toggleMute(defaultSettings());
    expect(muted).toEqual({ ...defaultSettings(), muted: true });
    expect(toggleMute(muted)).toEqual(defaultSettings());
  });

  it('a stored volume between steps comes back on its step', () => {
    const raw = '{"version":1,"music":0.47,"sfx":0.8,"voice":0.8,"muted":false}';
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: raw })).music).toBe(0.5);
  });

  it('never fails on damaged or foreign settings: the defaults come back', () => {
    const damaged = [
      '{not json',
      'null',
      '{"version":2,"music":0.5,"sfx":0.8,"voice":0.8,"muted":false}',
      '{"version":1,"music":1.5,"sfx":0.8,"voice":0.8,"muted":false}',
      '{"version":1,"music":"loud","sfx":0.8,"voice":0.8,"muted":false}',
      '{"version":1,"music":0.5,"sfx":0.8,"voice":0.8}',
    ];
    for (const raw of damaged) {
      expect(loadSettings(memoryStore({ [SETTINGS_KEY]: raw }))).toEqual(defaultSettings());
    }
  });

  it('a browser that refuses its storage still starts, and refuses to write in silence', () => {
    const refusing = {
      getItem: (): string | null => {
        throw new Error('denied');
      },
      setItem: (): void => {
        throw new Error('denied');
      },
    };
    expect(loadSettings(refusing)).toEqual(defaultSettings());
    expect(() => writeSettings(refusing, defaultSettings())).not.toThrow();
  });
});
