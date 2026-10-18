import { describe, expect, it } from 'vitest';
import { ASSET_KINDS, LOAD_GROUPS, parseManifest } from './manifestSchema';

const SHA = 'a'.repeat(64);

/** A small manifest of one pack, one sheet and one sound, valid unless a test breaks it. */
const valid = () => ({
  packs: {
    ninja: {
      name: 'Ninja Adventure Asset Pack',
      version: null,
      author: 'Pixel-boy and AAA',
      license: 'CC0-1.0',
      url: 'https://pixel-boy.itch.io/ninja-adventure-asset-pack',
    },
  },
  assets: {
    'tiles.nature': {
      path: 'assets/images/tiles/nature.png',
      kind: 'sheet',
      group: 'boot',
      pack: 'ninja',
      source: 'Backgrounds/Tilesets/TilesetNature.png',
      bytes: 43359,
      sha256: SHA,
      image: { width: 384, height: 336 },
      frame: { width: 16, height: 16 },
    },
    'music.ch2': {
      path: 'assets/audio/music/ch2.ogg',
      kind: 'music',
      group: 'ch2',
      pack: 'ninja',
      source: 'Audio/Musics/39 - Boat.ogg',
      bytes: 2333552,
      sha256: SHA,
    },
  },
});

describe('the asset manifest', () => {
  it('accepts a well-formed manifest as it is', () => {
    expect(parseManifest(valid())).toEqual(valid());
  });

  it('knows the seven kinds of asset and the load groups of the plan', () => {
    expect(ASSET_KINDS).toEqual(['image', 'sheet', 'font', 'music', 'sfx', 'voice', 'jingle']);
    expect(LOAD_GROUPS).toEqual([
      'boot',
      'hub',
      'ch0',
      'ch1',
      'ch2',
      'ch3',
      'ch4',
      'ch5',
      'ch6',
      'ch7',
      'credits',
    ]);
  });

  it('rejects an unknown kind or group', () => {
    const kind = valid();
    Object.assign(kind.assets['music.ch2'], { kind: 'video' });
    expect(() => parseManifest(kind)).toThrow();
    const group = valid();
    Object.assign(group.assets['music.ch2'], { group: 'ch8' });
    expect(() => parseManifest(group)).toThrow();
  });

  it('rejects a checksum that is not a sha256 in hex', () => {
    const broken = valid();
    Object.assign(broken.assets['music.ch2'], { sha256: 'xyz' });
    expect(() => parseManifest(broken)).toThrow();
  });

  it('rejects an asset of a pack it does not list', () => {
    const broken = valid();
    Object.assign(broken.assets['music.ch2'], { pack: 'elsewhere' });
    expect(() => parseManifest(broken)).toThrow(/elsewhere/);
  });

  it('rejects a path outside the public assets folder', () => {
    const broken = valid();
    Object.assign(broken.assets['music.ch2'], { path: 'audio/music/ch2.ogg' });
    expect(() => parseManifest(broken)).toThrow();
  });
});
