import { describe, expect, it } from 'vitest';
import { parseFallbacks } from './fallbackSchema';

const SHA = 'b'.repeat(64);

/** A table of one fallback, valid unless a test breaks it. */
const valid = () => ({
  encoder: 'ffmpeg 7.1.5',
  files: {
    'music.hub': { path: 'assets/audio/music/hub.m4a', from: SHA, bytes: 830_000 },
  },
});

describe('the table of audio fallbacks', () => {
  it('reads a valid table', () => {
    expect(parseFallbacks(valid())).toEqual(valid());
  });

  it('reads an empty table: no sound has a fallback', () => {
    expect(parseFallbacks({ encoder: 'none', files: {} }).files).toEqual({});
  });

  it('refuses a fallback outside the served assets', () => {
    const table = valid();
    table.files['music.hub'].path = '/tmp/hub.m4a';
    expect(() => parseFallbacks(table)).toThrow();
  });

  it('refuses a fallback that does not say which original it was made from', () => {
    const table = valid();
    table.files['music.hub'].from = 'abc';
    expect(() => parseFallbacks(table)).toThrow();
  });

  it('refuses unknown fields and a missing encoder', () => {
    expect(() => parseFallbacks({ ...valid(), extra: 1 })).toThrow();
    expect(() => parseFallbacks({ files: {} })).toThrow();
  });
});
