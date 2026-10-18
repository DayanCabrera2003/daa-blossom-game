import { describe, expect, it } from 'vitest';
import { ASSET_KEYS, assetEntry, keysOfKind } from '../src/game/assets/keys';

// Safari may not play OGG (plan 06, risks): the sounds the game cannot do without in any browser,
// the babble syllables and the synthesized chimes, sparkle and chords, ship as WAV. Music and the
// pack effects stay OGG until a browser is shown to miss them.

describe('sound formats', () => {
  it.each(keysOfKind('voice'))('ships the syllable %s as WAV', (key) => {
    expect(assetEntry(key).path).toMatch(/\.wav$/);
  });

  it.each(ASSET_KEYS.filter((key) => assetEntry(key).pack === 'own'))(
    'ships the synthesized %s as WAV',
    (key) => {
      expect(assetEntry(key).path).toMatch(/\.wav$/);
    },
  );
});
