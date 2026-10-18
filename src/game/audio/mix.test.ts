import { describe, expect, it } from 'vitest';
import { duckLevel, startDuck, trackLevel } from '@services/musicFade';
import { defaultSettings } from '@services/settings';
import { keysOfKind } from '../assets/keys';
import type { Speaker } from '../systems/speaker';
import { MIX, MIX_RANGES, soundGainOf } from './mix';

// The mix as data (plan 09, phase 8): every number the author tunes by ear lives in one table, and
// each stays in the range written next to it, so a change of a number cannot break the game.

/** Every speaker, as the table of paces lists them. */
const SPEAKERS = Object.keys(MIX.paces) as Speaker[];

/** Whether `value` lies in `[low, high]`. */
const within = (value: number, [low, high]: readonly [number, number]): boolean =>
  value >= low && value <= high;

describe('the mix', () => {
  it('starts each channel at the volume of a new player', () => {
    const { music, sfx, voice } = defaultSettings();
    expect(MIX.channels).toEqual({ music, sfx, voice });
    for (const gain of Object.values(MIX.channels))
      expect(within(gain, MIX_RANGES.gain)).toBe(true);
  });

  it('gives every effect and every jingle of the manifest its own gain, between 0 and 1', () => {
    const keys = [...keysOfKind('sfx'), ...keysOfKind('jingle')];
    expect(Object.keys(MIX.sounds).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(within(soundGainOf(key), MIX_RANGES.gain), key).toBe(true);
  });

  it('plays a music track or a syllable, which have no gain of their own, at full', () => {
    expect(soundGainOf('music.hub')).toBe(1);
    expect(soundGainOf('voice.6')).toBe(1);
  });

  it('keeps the music fades and the replay in their ranges', () => {
    const { crossfadeMs, duckLevel: level, duckMs, unduckMs } = MIX.music;
    expect(within(level, MIX_RANGES.gain)).toBe(true);
    for (const ms of [crossfadeMs, duckMs, unduckMs]) {
      expect(within(ms, MIX_RANGES.fadeMs)).toBe(true);
    }
    expect(within(MIX.replay, MIX_RANGES.gain)).toBe(true);
  });

  it('a jingle brings the music down to the level the table gives, and back after it', () => {
    const duck = startDuck(null, 1000, MIX.music);
    expect(duckLevel(duck, 1000 + MIX.music.duckMs, MIX.music)).toBeCloseTo(MIX.music.duckLevel);
    const ended = { ...duck, end: 2000 };
    expect(duckLevel(ended, 2000 + MIX.music.unduckMs, MIX.music)).toBe(1);
  });

  it('crossfades a new track in over the time the table gives', () => {
    expect(trackLevel({ start: 0, end: null }, MIX.music.crossfadeMs, MIX.music)).toBe(1);
  });

  it("keeps each speaker's babble within the pitches of plan 06, section 1.9", () => {
    for (const speaker of SPEAKERS) {
      const voice = MIX.voices[speaker];
      const allowed = MIX_RANGES.babbleRate[speaker];
      if (voice === null) {
        expect(allowed).toBeNull();
        continue;
      }
      expect(voice.every).toBeGreaterThanOrEqual(1);
      voice.layers.forEach(({ rate: [low, high], delay, volume }, layer) => {
        const range = allowed?.[layer];
        expect(range, `${speaker} ${layer}`).toBeDefined();
        if (range === undefined) return;
        expect(low).toBeLessThanOrEqual(high);
        expect(within(low, range) && within(high, range), `${speaker} ${layer}`).toBe(true);
        expect(within(volume, MIX_RANGES.gain)).toBe(true);
        expect(delay).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('keeps every pace of typing and every pause in its range', () => {
    for (const speaker of SPEAKERS) {
      const { lettersPerSecond, commaPause, stopPause } = MIX.paces[speaker];
      expect(within(lettersPerSecond, MIX_RANGES.lettersPerSecond), speaker).toBe(true);
      expect(within(commaPause, MIX_RANGES.pauseMs), speaker).toBe(true);
      expect(within(stopPause, MIX_RANGES.pauseMs), speaker).toBe(true);
    }
  });
});
