import { describe, expect, it } from 'vitest';
import { ASSET_KEYS, assetEntry, keysOfKind, packCredit, packCredits, type AssetKey } from './keys';

describe('asset keys', () => {
  it('lists every key of the manifest, in its order', () => {
    expect(ASSET_KEYS[0]).toBe('image.palette');
    expect(ASSET_KEYS).toContain('music.hub');
    expect(new Set(ASSET_KEYS).size).toBe(ASSET_KEYS.length);
  });

  it('gives the entry of a key', () => {
    expect(assetEntry('font.monogram')).toMatchObject({
      path: 'assets/fonts/monogram-extended.ttf',
      kind: 'font',
      group: 'boot',
      pack: 'monogram',
    });
  });

  it('fails loudly on a key the manifest does not have', () => {
    expect(() => assetEntry('music.nowhere' as AssetKey)).toThrow(/music\.nowhere/);
  });

  it('names music, effects, syllables and jingles by their kind', () => {
    for (const [prefix, kind] of [
      ['music.', 'music'],
      ['sfx.', 'sfx'],
      ['voice.', 'voice'],
      ['jingle.', 'jingle'],
      ['font.', 'font'],
    ] as const) {
      for (const key of ASSET_KEYS.filter((key) => key.startsWith(prefix))) {
        expect(assetEntry(key).kind).toBe(kind);
      }
      expect(keysOfKind(kind).every((key) => key.startsWith(prefix))).toBe(true);
    }
  });

  it('lists the keys of one kind', () => {
    expect(keysOfKind('voice')).toEqual([
      'voice.1',
      'voice.2',
      'voice.3',
      'voice.4',
      'voice.6',
      'voice.7',
      'voice.10',
    ]);
  });

  it('gives the credits of each pack used', () => {
    expect(packCredits().map((pack) => pack.name)).toContain('Ninja Adventure Asset Pack');
  });

  it('gives the credits of one pack by its id, and fails loudly on an unknown one', () => {
    expect(packCredit('monogram').author).toBe('Vinícius Menézio (datagoblin)');
    expect(() => packCredit('elsewhere')).toThrow(/elsewhere/);
  });
});
