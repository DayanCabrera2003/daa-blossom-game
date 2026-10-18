import { catalog } from '@levels/catalog';
import { starsCeiling } from '@levels/starsCeiling';
import { describe, expect, it } from 'vitest';
import { COSMETIC_IDS, COSMETICS, newCosmetics, openCosmetics } from './cosmetics';
import { emptySave, recordCosmeticsSeen } from './save';

describe('the cosmetics of the hub', () => {
  it('a new player has none', () => {
    expect(openCosmetics({ stars: 0, seeds: 0 }, false)).toEqual([]);
  });

  it('each comes on its own once the stars reach its threshold, and stays', () => {
    expect(openCosmetics({ stars: 49, seeds: 0 }, false)).toEqual(['butterfly', 'frog']);
    expect(openCosmetics({ stars: 50, seeds: 0 }, false)).toEqual(['butterfly', 'frog', 'cat']);
  });

  it('the first seed brings the seedlings', () => {
    expect(openCosmetics({ stars: 15, seeds: 1 }, false)).toEqual(['butterfly', 'seedling']);
  });

  it('teacher mode shows them all', () => {
    expect(openCosmetics({ stars: 0, seeds: 0 }, true)).toEqual([
      ...COSMETICS.map((cosmetic) => cosmetic.id),
      'seedling',
    ]);
  });

  it('names every cosmetic once, in the order they come', () => {
    expect(COSMETIC_IDS).toEqual(openCosmetics({ stars: 0, seeds: 0 }, true));
    expect(new Set(COSMETIC_IDS).size).toBe(COSMETIC_IDS.length);
  });

  it('a cosmetic is new until it has been announced', () => {
    const open = openCosmetics({ stars: 30, seeds: 1 }, false);
    expect(newCosmetics(open, emptySave())).toEqual(['butterfly', 'frog', 'seedling']);
    const seen = recordCosmeticsSeen(emptySave(), ['frog', 'butterfly']);
    expect(newCosmetics(open, seen)).toEqual(['seedling']);
  });

  it('the thresholds go up, one cosmetic at a time', () => {
    const thresholds = COSMETICS.map((cosmetic) => cosmetic.stars);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    expect(new Set(thresholds).size).toBe(thresholds.length);
  });

  it('the last one asks for no more stars than the catalog can give', () => {
    const most = catalog()
      .filter((level) => !level.data.draft)
      .reduce((sum, level) => sum + starsCeiling(level.data), 0);
    expect(COSMETICS.at(-1)?.stars).toBeLessThanOrEqual(most);
  });
});
