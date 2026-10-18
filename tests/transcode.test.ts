import { describe, expect, it } from 'vitest';
import type { Manifest } from '../src/game/assets/manifestSchema';
import { ffmpegArgs, fallbackJobs, fallbackPath, fallbackTable } from '../tools/assets/transcode';

const SHA = 'd'.repeat(64);

/** A manifest entry of `kind` served at `path`. */
const entry = (path: string, kind: 'music' | 'sfx' | 'image') => ({
  path,
  kind,
  group: 'boot' as const,
  pack: 'p',
  source: 'x',
  bytes: 10,
  sha256: SHA,
});

const MANIFEST: Manifest = {
  packs: {},
  assets: {
    'music.hub': entry('assets/audio/music/hub.ogg', 'music'),
    'sfx.fold': entry('assets/audio/sfx/fold.wav', 'sfx'),
    'tiles.x': entry('assets/images/x.png', 'image'),
  },
};

describe('the audio fallbacks to make', () => {
  it('sits each fallback next to its original, as AAC in .m4a', () => {
    expect(fallbackPath('assets/audio/music/hub.ogg')).toBe('assets/audio/music/hub.m4a');
  });

  it('makes one for every Ogg sound, and none for wave files or pictures', () => {
    expect(fallbackJobs(MANIFEST)).toEqual([
      {
        key: 'music.hub',
        input: 'public/assets/audio/music/hub.ogg',
        output: 'public/assets/audio/music/hub.m4a',
        path: 'assets/audio/music/hub.m4a',
        from: SHA,
      },
    ]);
  });

  it('asks ffmpeg for AAC at 64 kb/s per channel, without tags, the same bytes on every run', () => {
    expect(ffmpegArgs('in.ogg', 'out.m4a', 2)).toEqual([
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      'in.ogg',
      '-map',
      '0:a',
      '-map_metadata',
      '-1',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-fflags',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      'out.m4a',
    ]);
    expect(ffmpegArgs('in.ogg', 'out.m4a', 1)).toContain('64k');
  });

  it('writes the table of what it made, with the encoder that made it', () => {
    const jobs = fallbackJobs(MANIFEST);
    expect(fallbackTable('ffmpeg 7.1.5', jobs, () => 1234)).toEqual({
      encoder: 'ffmpeg 7.1.5',
      files: { 'music.hub': { path: 'assets/audio/music/hub.m4a', from: SHA, bytes: 1234 } },
    });
  });
});
