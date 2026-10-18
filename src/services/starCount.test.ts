import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from './progress';
import { emptySave, recordCompletion, type SaveData } from './save';
import { chapterStars, totalStars } from './starCount';

/** Chapter 1 with its secret flower and a draft, and chapter 2. */
const CATALOG: CatalogEntry[] = [
  { id: '1.1', draft: false },
  { id: '1.2', draft: false },
  { id: '1.3', draft: false, secret: { stars: 3 } },
  { id: '1.4', draft: true },
  { id: '2.1', draft: false },
];

/** A save with each level of `won` completed with its stars. */
const saved = (won: Record<string, number>): SaveData =>
  Object.entries(won).reduce((save, [id, stars]) => recordCompletion(save, id, stars), emptySave());

describe('the stars of a player', () => {
  it('a new player has none', () => {
    expect(totalStars(CATALOG, emptySave())).toBe(0);
    expect(chapterStars(CATALOG, emptySave(), '1')).toBe(0);
  });

  it('in all, the best stars of every level won, secret flowers included', () => {
    expect(totalStars(CATALOG, saved({ '1.1': 2, '1.2': 3, '1.3': 2, '2.1': 1 }))).toBe(8);
  });

  it('never counts a draft, nor a level the catalog no longer has', () => {
    expect(totalStars(CATALOG, saved({ '1.1': 1, '1.4': 3, '9.9': 3 }))).toBe(1);
  });

  it('by chapter, only its levels of the main path, which are what open its flower', () => {
    const save = saved({ '1.1': 2, '1.2': 3, '1.3': 2, '1.4': 3, '2.1': 1 });
    expect(chapterStars(CATALOG, save, '1')).toBe(5);
    expect(chapterStars(CATALOG, save, '2')).toBe(1);
  });
});
