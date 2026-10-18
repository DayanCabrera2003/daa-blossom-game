import { describe, expect, it } from 'vitest';
import { audioSources } from '../src/game/assets/audioSources';
import fallbackJson from '../src/game/assets/fallbacks.json';
import { parseFallbacks } from '../src/game/assets/fallbackSchema';
import { assetEntry, keysOfKind, type AssetKey } from '../src/game/assets/keys';

// The shipped sounds and their fallbacks (plan 09, phase 8): Safari before 18.4 cannot decode the
// Ogg container, so every Ogg Vorbis sound comes with an AAC copy made from it.

describe('the fallbacks of the shipped sounds', () => {
  const table = parseFallbacks(fallbackJson);
  const sounds: AssetKey[] = (['music', 'sfx', 'voice', 'jingle'] as const).flatMap(keysOfKind);

  it('every Ogg Vorbis sound has an AAC fallback, which Safari before 18.4 plays', () => {
    for (const key of sounds.filter((sound) => assetEntry(sound).path.endsWith('.ogg'))) {
      expect(audioSources(key), key).toEqual([
        assetEntry(key).path,
        assetEntry(key).path.replace(/\.ogg$/, '.m4a'),
      ]);
    }
  });

  it('every fallback belongs to an Ogg sound of the manifest and was made from it', () => {
    for (const [key, fallback] of Object.entries(table.files)) {
      const entry = assetEntry(key as AssetKey);
      expect(entry.path.endsWith('.ogg'), key).toBe(true);
      expect(fallback.from, key).toBe(entry.sha256);
    }
  });
});
