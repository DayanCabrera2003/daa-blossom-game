import { describe, expect, it } from 'vitest';
import { audioSources } from './audioSources';
import { ASSET_KEYS, assetEntry, type AssetKey } from './keys';
import {
  BOOT_KEYS,
  chapterGroup,
  groupKeys,
  levelKeys,
  loadRequests,
  rawKeyOf,
  recolouredSheets,
} from './loadPlan';
import { LOAD_GROUPS } from './manifestSchema';

const CHAPTERS = ['ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'] as const;
const nothingLoaded = (): boolean => false;

describe('load groups', () => {
  it('puts every key of the manifest in exactly one group', () => {
    const grouped = LOAD_GROUPS.flatMap((group) => groupKeys(group));
    expect([...grouped].sort()).toEqual([...ASSET_KEYS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('keeps the groups in manifest order', () => {
    expect(BOOT_KEYS).toEqual(ASSET_KEYS.filter((key) => assetEntry(key).group === 'boot'));
  });

  it('loads at boot the art, effects, syllables, jingles and the hub music', () => {
    const kinds = new Set(BOOT_KEYS.map((key) => assetEntry(key).kind));
    for (const kind of ['image', 'sheet', 'sfx', 'voice', 'jingle', 'music'] as const) {
      expect(kinds).toContain(kind);
    }
    expect(BOOT_KEYS.filter((key) => assetEntry(key).kind === 'music')).toEqual(['music.hub']);
  });

  it('gives every chapter a music track of its own, and nothing else', () => {
    for (const chapter of CHAPTERS) {
      const keys = groupKeys(chapter);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.every((key) => assetEntry(key).kind === 'music')).toBe(true);
      expect(keys).toContain(`music.${chapter}`);
    }
    expect(groupKeys('ch6')).toEqual(['music.ch6', 'music.ch6Race']);
  });

  it('keeps the credits music for the credits screen', () => {
    expect(groupKeys('credits')).toEqual(['music.credits']);
  });
});

describe('chapterGroup', () => {
  it('reads the chapter of a level from its id', () => {
    expect(chapterGroup('0.1')).toBe('ch0');
    expect(chapterGroup('4.10')).toBe('ch4');
    expect(chapterGroup('7.4')).toBe('ch7');
  });

  it('has no group for a chapter the manifest does not know', () => {
    expect(chapterGroup('9.1')).toBeNull();
    expect(chapterGroup('not a level')).toBeNull();
  });
});

describe('levelKeys', () => {
  it('loads the music of the level chapter when it is missing', () => {
    expect(levelKeys('4.10', nothingLoaded)).toEqual(['music.ch4']);
    expect(levelKeys('6.2', nothingLoaded)).toEqual(['music.ch6', 'music.ch6Race']);
  });

  it('loads nothing that is already loaded', () => {
    expect(levelKeys('4.10', () => true)).toEqual([]);
    const loaded = (key: AssetKey): boolean => key === 'music.ch6';
    expect(levelKeys('6.2', loaded)).toEqual(['music.ch6Race']);
  });

  it('loads nothing for a level outside the known chapters', () => {
    expect(levelKeys('9.1', nothingLoaded)).toEqual([]);
  });
});

describe('loadRequests', () => {
  it('loads images and sheets by their path, sheets cut at their frame size', () => {
    expect(loadRequests(['image.palette', 'tiles.nature', 'fx.smoke'])).toEqual([
      { loader: 'image', key: 'image.palette', path: 'assets/images/palette.png' },
      {
        loader: 'spritesheet',
        key: 'tiles.nature',
        path: 'assets/images/tiles/nature.png',
        frameWidth: 16,
        frameHeight: 16,
      },
      {
        loader: 'spritesheet',
        key: 'fx.smoke',
        path: 'assets/images/fx/smoke.png',
        frameWidth: 32,
        frameHeight: 32,
      },
    ]);
  });

  it('loads music, effects, syllables and jingles as audio, each offered as its files', () => {
    const keys = ['music.hub', 'sfx.stone', 'voice.6', 'jingle.unlock'] as const;
    expect(loadRequests(keys)).toEqual(
      keys.map((key) => ({ loader: 'audio', key, paths: audioSources(key) })),
    );
  });

  it('offers a sound its original first, so a browser that plays it never fetches the fallback', () => {
    expect(loadRequests(['voice.6'])).toEqual([
      { loader: 'audio', key: 'voice.6', paths: ['assets/audio/voice/voice6.wav'] },
    ]);
    for (const request of loadRequests(['music.hub', 'sfx.stone'])) {
      expect(request.loader === 'audio' && request.paths[0]?.endsWith('.ogg')).toBe(true);
    }
  });

  it('leaves the font to the page, which loads it before the game starts', () => {
    expect(loadRequests(['font.monogram'])).toEqual([]);
  });

  it('loads a Kenney sheet as a plain image under its raw key, to be recoloured', () => {
    expect(loadRequests(['kenney.town'])).toEqual([
      { loader: 'image', key: rawKeyOf('kenney.town'), path: 'assets/images/kenney/tiny-town.png' },
    ]);
    expect(rawKeyOf('kenney.town')).not.toBe('kenney.town');
  });

  it('asks for every boot key but the font, each under one key', () => {
    const requests = loadRequests(BOOT_KEYS);
    expect(requests).toHaveLength(BOOT_KEYS.length - 1);
    expect(new Set(requests.map((request) => request.key)).size).toBe(requests.length);
  });
});

describe('recolouredSheets', () => {
  it('recolours the Kenney art of the boot group, and nothing of Ninja Adventure', () => {
    expect(recolouredSheets(BOOT_KEYS)).toEqual([
      {
        key: 'kenney.town',
        rawKey: rawKeyOf('kenney.town'),
        frame: { width: 16, height: 16 },
      },
      { key: 'kenney.ui', rawKey: rawKeyOf('kenney.ui'), frame: { width: 16, height: 16 } },
    ]);
  });

  it('recolours nothing among sounds, even Kenney ones', () => {
    expect(recolouredSheets(['sfx.stone', 'jingle.victory', 'music.hub'])).toEqual([]);
  });
});
