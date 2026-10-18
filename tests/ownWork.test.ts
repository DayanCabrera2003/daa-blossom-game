import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Manifest } from '../src/game/assets/manifestSchema';
import { makeOwnWork, withOwnWork } from '../tools/assets/ownWork';
import type { OwnWork } from '../tools/assets/types';

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const BELL = Uint8Array.from([1, 2, 3]);
const CHORD = Uint8Array.from([4, 5]);

const OWN: OwnWork = {
  id: 'own',
  credit: {
    name: 'Original work',
    version: null,
    author: 'The author',
    license: 'MIT',
    url: 'https://example.org/game',
  },
  files: [
    {
      key: 'sfx.bell',
      source: 'bell',
      out: 'audio/sfx/bell.wav',
      kind: 'sfx',
      group: 'boot',
      make: () => BELL,
    },
    {
      key: 'sfx.chord',
      source: 'chord',
      out: 'audio/sfx/chord.wav',
      kind: 'sfx',
      group: 'boot',
      make: () => CHORD,
    },
  ],
};

/** A manifest as the packs give it, with one pack file and a stale made file to be replaced. */
const MANIFEST: Manifest = {
  packs: {
    test: {
      name: 'Test Pack',
      version: null,
      author: 'Someone',
      license: 'CC0-1.0',
      url: 'https://example.org/pack',
    },
    own: { ...OWN.credit, author: 'Old name' },
  },
  assets: {
    'sfx.click': {
      path: 'assets/audio/sfx/click.ogg',
      kind: 'sfx',
      group: 'boot',
      pack: 'test',
      source: 'click.ogg',
      bytes: 10,
      sha256: '0'.repeat(64),
    },
    'sfx.old': {
      path: 'assets/audio/sfx/old.wav',
      kind: 'sfx',
      group: 'boot',
      pack: 'own',
      source: 'old',
      bytes: 1,
      sha256: '1'.repeat(64),
    },
  },
};

describe('the files the project makes itself', () => {
  it('writes each under public/assets with the bytes its maker gives', () => {
    const { files } = makeOwnWork(OWN);
    expect(files).toEqual([
      { path: 'public/assets/audio/sfx/bell.wav', bytes: BELL },
      { path: 'public/assets/audio/sfx/chord.wav', bytes: CHORD },
    ]);
  });

  it('describes each in the manifest under the own work, by the name of its parameters', () => {
    const { assets } = makeOwnWork(OWN);
    expect(assets['sfx.bell']).toEqual({
      path: 'assets/audio/sfx/bell.wav',
      kind: 'sfx',
      group: 'boot',
      pack: 'own',
      source: 'bell',
      bytes: 3,
      sha256: sha256(BELL),
    });
  });

  it('replaces the own work of a manifest, keeping every pack file in its place', () => {
    const { assets } = makeOwnWork(OWN);
    const merged = withOwnWork(MANIFEST, OWN, assets);
    expect(Object.keys(merged.assets)).toEqual(['sfx.click', 'sfx.bell', 'sfx.chord']);
    expect(merged.assets['sfx.click']).toEqual(MANIFEST.assets['sfx.click']);
    expect(Object.keys(merged.packs)).toEqual(['test', 'own']);
    expect(merged.packs.own).toEqual(OWN.credit);
  });

  it('refuses a made file whose key a pack file already has', () => {
    const [bell] = OWN.files;
    if (bell === undefined) throw new Error('fixture');
    const clash: OwnWork = { ...OWN, files: [{ ...bell, key: 'sfx.click' }] };
    expect(() => withOwnWork(MANIFEST, clash, makeOwnWork(clash).assets)).toThrow(/sfx\.click/);
  });
});
