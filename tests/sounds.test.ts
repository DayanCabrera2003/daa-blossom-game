import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ASSET_KEYS, assetEntry } from '../src/game/assets/keys';
import { parseWav } from '../tools/assets/wav';
import { CHIME_COUNT, OWN_WORK, pentatonicFrequency, SOUNDS } from '../tools/synth/sounds';
import { strongest } from './support/spectrum';

const RATE = 22050;

/** Whether two files hold the same bytes (a deep comparison of long arrays is far slower). */
const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

const byKey = (key: string) => {
  const sound = SOUNDS.find((candidate) => candidate.key === key);
  if (sound === undefined) throw new Error(`no sound ${key}`);
  return sound;
};

describe('the pentatonic scale of the chimes', () => {
  const scale = Array.from({ length: CHIME_COUNT }, (_, i) => pentatonicFrequency(i));

  it('has 15 notes, from C5 to A7', () => {
    expect(scale).toHaveLength(15);
    expect(scale[0]).toBeCloseTo(523.25, 2);
    expect(scale[14]).toBeCloseTo(3520, 6);
  });

  it('rises strictly, an octave every five notes', () => {
    for (let i = 1; i < scale.length; i++) expect(scale[i]).toBeGreaterThan(scale[i - 1] ?? 0);
    expect((scale[5] ?? 0) / (scale[0] ?? 1)).toBeCloseTo(2, 9);
  });
});

describe('the synthesized sounds', () => {
  it('are the 15 chimes, the sparkle and the fold and unfold chords, as effects loaded at boot', () => {
    expect(SOUNDS.map((sound) => sound.key)).toEqual([
      ...Array.from({ length: 15 }, (_, i) => `sfx.chime${i + 1}`),
      'sfx.sparkle',
      'sfx.fold',
      'sfx.unfold',
    ]);
    for (const file of OWN_WORK.files.filter((made) => made.kind === 'sfx')) {
      expect(file.kind).toBe('sfx');
      expect(file.group).toBe('boot');
      expect(file.out).toMatch(/^audio\/sfx\/[a-z0-9-]+\.wav$/);
    }
  });

  it('give the prologue its crickets as the music of chapter 0, loaded with the chapter', () => {
    const night = OWN_WORK.files.filter((made) => made.kind !== 'sfx');
    expect(night.map((made) => [made.key, made.kind, made.group, made.out])).toEqual([
      ['music.ch0', 'music', 'ch0', 'audio/music/ch0-night.wav'],
    ]);
  });

  it('play one note each for the chimes, the highest three rising for the sparkle', () => {
    expect(byKey('sfx.chime3').notes).toEqual([{ step: 2, start: 0, gain: 1 }]);
    expect(byKey('sfx.sparkle').notes.map((note) => note.step)).toEqual([12, 13, 14]);
    const starts = byKey('sfx.sparkle').notes.map((note) => note.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('unfold the chord of the fold, one note at a time from the top down', () => {
    const fold = byKey('sfx.fold').notes;
    const unfold = byKey('sfx.unfold').notes;
    expect(new Set(fold.map((note) => note.start)).size).toBe(1);
    expect(unfold.map((note) => note.step)).toEqual(fold.map((note) => note.step).reverse());
    expect(unfold.map((note) => note.start)).toEqual(
      [...unfold.map((note) => note.start)].sort((a, b) => a - b),
    );
  });

  it('are mono 16-bit wave files at 22.05 kHz, the same bytes on every run', () => {
    for (const file of OWN_WORK.files) {
      const bytes = file.make();
      expect(sameBytes(file.make(), bytes)).toBe(true);
      const audio = parseWav(bytes);
      expect(audio.sampleRate).toBe(RATE);
      expect(audio.channels).toHaveLength(1);
    }
  });

  it.each(Array.from({ length: 15 }, (_, i) => i))(
    'chime %i rings its note to within 1 %%, without saturating',
    (step) => {
      const file = OWN_WORK.files[step];
      if (file === undefined) throw new Error('fixture');
      const [samples = new Int16Array(0)] = parseWav(file.make()).channels;
      const hz = pentatonicFrequency(step);
      const found = strongest(samples.subarray(0, 8192), RATE, {
        low: hz * 0.95,
        high: hz * 1.05,
        step: hz / 2000,
      });
      expect(Math.abs(found - hz) / hz).toBeLessThan(0.01);
      expect(Math.max(...Array.from(samples, Math.abs))).toBeLessThan(32767);
    },
  );

  it('are credited as the original work of the project, under its license', () => {
    expect(OWN_WORK.credit.name).toBe('Original work');
    expect(OWN_WORK.credit.license).toBe('MIT');
  });
});

describe('the committed synthesized sounds', () => {
  const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

  // Unlike the pack files, these can be checked without any zip: CI remakes them from the parameters.
  it.each(OWN_WORK.files.map((file) => [file.key, file] as const))(
    '%s is exactly what its parameters make, listed under the original work',
    (key, file) => {
      expect(ASSET_KEYS).toContain(key);
      const entry = assetEntry(key as (typeof ASSET_KEYS)[number]);
      expect(entry.pack).toBe(OWN_WORK.id);
      expect(entry.source).toBe(file.source);
      expect(sameBytes(readFileSync(PUBLIC + entry.path), file.make())).toBe(true);
    },
  );
});
