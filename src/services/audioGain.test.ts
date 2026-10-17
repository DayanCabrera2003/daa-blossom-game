import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { channelGain, soundGain } from './audioGain';
import { AUDIO_CHANNELS, defaultSettings, setVolume, toggleMute } from './settings';

const channel = fc.constantFrom(...AUDIO_CHANNELS);

describe('how loud each audio channel plays', () => {
  it('a channel plays at its own volume while the tab is shown', () => {
    const settings = setVolume(defaultSettings(), 'sfx', 0.3);
    expect(channelGain(settings, 'music', false)).toBe(0.5);
    expect(channelGain(settings, 'sfx', false)).toBe(0.3);
    expect(channelGain(settings, 'voice', false)).toBe(0.8);
  });

  it('with mute on, all three channels are silent, whatever their volumes', () => {
    fc.assert(
      fc.property(channel, fc.double({ min: 0, max: 1 }), (which, value) => {
        const muted = toggleMute(setVolume(defaultSettings(), which, value));
        for (const each of AUDIO_CHANNELS) expect(channelGain(muted, each, false)).toBe(0);
      }),
    );
  });

  it('nothing plays while the tab is hidden', () => {
    for (const each of AUDIO_CHANNELS) {
      expect(channelGain(defaultSettings(), each, true)).toBe(0);
    }
  });

  it("a sound plays at its channel's gain times its own volume, never above the channel", () => {
    expect(soundGain(0.5, 0.5)).toBe(0.25);
    expect(soundGain(0.8, 1)).toBe(0.8);
    expect(soundGain(0.8, 3)).toBe(0.8);
    expect(soundGain(0.8, -1)).toBe(0);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1 }), fc.double({ noNaN: true }), (gain, own) => {
        const played = soundGain(gain, own);
        expect(played).toBeGreaterThanOrEqual(0);
        expect(played).toBeLessThanOrEqual(gain);
      }),
    );
  });
});
