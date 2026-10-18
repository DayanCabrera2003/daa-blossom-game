import { describe, expect, it } from 'vitest';
import type { Fallbacks } from '../src/game/assets/fallbackSchema';
import type { Manifest } from '../src/game/assets/manifestSchema';
import {
  checkFallbacks,
  DURATION_SLACK_MS,
  type FallbackFacts,
} from '../tools/assets/fallbackCheck';

const SHA = 'e'.repeat(64);

const MANIFEST: Manifest = {
  packs: {},
  assets: {
    'music.hub': {
      path: 'assets/audio/music/hub.ogg',
      kind: 'music',
      group: 'boot',
      pack: 'p',
      source: 'x',
      bytes: 10,
      sha256: SHA,
    },
    'sfx.fold': {
      path: 'assets/audio/sfx/fold.wav',
      kind: 'sfx',
      group: 'boot',
      pack: 'p',
      source: 'y',
      bytes: 10,
      sha256: SHA,
    },
  },
};

const TABLE: Fallbacks = {
  encoder: 'ffmpeg 7.1.5',
  files: { 'music.hub': { path: 'assets/audio/music/hub.m4a', from: SHA, bytes: 500 } },
};

/** The files on disk: the original lasts 51 692 ms, the fallback `fallbackMs` and 500 bytes. */
const disk = (fallbackMs: number | null, bytes = 500): FallbackFacts => ({
  originalMs: () => 51_692,
  fallback: (path) =>
    path === 'public/assets/audio/music/hub.m4a' && fallbackMs !== null
      ? { bytes, durationMs: fallbackMs }
      : null,
});

describe('the check of the audio fallbacks', () => {
  it('passes a fallback that exists, is made from its original and lasts as long', () => {
    expect(checkFallbacks(MANIFEST, TABLE, disk(51_692 + DURATION_SLACK_MS))).toEqual([]);
  });

  it('allows 50 ms either way, the encoder’s priming and padding', () => {
    expect(DURATION_SLACK_MS).toBe(50);
    expect(checkFallbacks(MANIFEST, TABLE, disk(51_692 - 50))).toEqual([]);
  });

  it('finds a fallback that is missing', () => {
    expect(checkFallbacks(MANIFEST, TABLE, disk(null))).toEqual([
      'public/assets/audio/music/hub.m4a is missing: run npm run assets:fallbacks',
    ]);
  });

  it('finds a fallback that lasts more or less than its original', () => {
    expect(checkFallbacks(MANIFEST, TABLE, disk(51_800))).toEqual([
      'public/assets/audio/music/hub.m4a lasts 51800 ms, its original 51692 ms',
    ]);
  });

  it('finds a fallback whose size is not the one the table gives', () => {
    expect(checkFallbacks(MANIFEST, TABLE, disk(51_692, 501))).toEqual([
      'public/assets/audio/music/hub.m4a has 501 bytes, the table says 500',
    ]);
  });

  it('finds a fallback made from another version of its original', () => {
    const hub = { path: 'assets/audio/music/hub.m4a', from: 'f'.repeat(64), bytes: 500 };
    const table: Fallbacks = { ...TABLE, files: { 'music.hub': hub } };
    expect(checkFallbacks(MANIFEST, table, disk(51_692))).toEqual([
      'music.hub: its fallback was made from another version of it: run npm run assets:fallbacks',
    ]);
  });

  it('finds an Ogg sound with no fallback and a fallback of no Ogg sound', () => {
    const table: Fallbacks = {
      encoder: 'x',
      files: { 'sfx.fold': { path: 'assets/audio/sfx/fold.m4a', from: SHA, bytes: 1 } },
    };
    expect(checkFallbacks(MANIFEST, table, disk(51_692))).toEqual([
      'music.hub has no fallback: run npm run assets:fallbacks',
      'sfx.fold has a fallback but is not an Ogg sound of the manifest',
    ]);
  });
});
