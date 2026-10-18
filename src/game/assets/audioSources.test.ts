import { describe, expect, it } from 'vitest';
import { audioSources, sourcesOf } from './audioSources';
import { assetEntry } from './keys';

const SHA = 'c'.repeat(64);

describe('the files a sound is offered as', () => {
  it('a sound without a fallback is offered as its one file', () => {
    expect(sourcesOf('assets/audio/sfx/fold.wav', undefined)).toEqual([
      'assets/audio/sfx/fold.wav',
    ]);
  });

  it('a sound with a fallback is offered as both, the original first', () => {
    const fallback = { path: 'assets/audio/music/hub.m4a', from: SHA, bytes: 1 };
    expect(sourcesOf('assets/audio/music/hub.ogg', fallback)).toEqual([
      'assets/audio/music/hub.ogg',
      'assets/audio/music/hub.m4a',
    ]);
  });

  it('a wave file, which every browser plays, has no fallback', () => {
    expect(audioSources('voice.6')).toEqual([assetEntry('voice.6').path]);
  });
});
