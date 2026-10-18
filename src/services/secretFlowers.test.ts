import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from './progress';
import { emptySave, recordCompletion, type SaveData } from './save';
import { secretFlowers } from './secretFlowers';

/** The synthetic catalog of plan 08: chapter 1 with its flower (3 stars), chapter 2 without. */
const CATALOG: CatalogEntry[] = [
  { id: '1.1', draft: false },
  { id: '1.2', draft: false },
  { id: '1.3', draft: false, secret: { stars: 3 } },
  { id: '2.1', draft: false },
];

/** A save with each level of `won` completed with its stars. */
const saved = (won: Record<string, number>): SaveData =>
  Object.entries(won).reduce((save, [id, stars]) => recordCompletion(save, id, stars), emptySave());

/** The flowers of the synthetic catalog for a save. */
const flowerOf = (save: SaveData, teacherMode = false) => secretFlowers(CATALOG, save, teacherMode);

describe('the secret flower of each chapter', () => {
  it('there is none while its chapter is half played', () => {
    expect(flowerOf(saved({ '1.1': 2 }))).toEqual([
      { chapter: '1', id: '1.3', state: { kind: 'none' } },
    ]);
  });

  it('a finished chapter with too few stars shows a bud that tells how many it has and needs', () => {
    expect(flowerOf(saved({ '1.1': 1, '1.2': 1 }))).toEqual([
      { chapter: '1', id: '1.3', state: { kind: 'bud', need: 3, have: 2 } },
    ]);
  });

  it('opens once the chapter has the stars, and the next chapter changes nothing', () => {
    expect(flowerOf(saved({ '1.1': 2, '1.2': 1 }))[0]?.state).toEqual({ kind: 'open' });
    expect(flowerOf(saved({ '1.1': 2, '1.2': 2, '2.1': 3 }))[0]?.state).toEqual({ kind: 'open' });
  });

  it('a won flower shows its stars', () => {
    const save = saved({ '1.1': 2, '1.2': 2, '1.3': 2 });
    expect(flowerOf(save)[0]?.state).toEqual({ kind: 'won', stars: 2 });
  });

  it('in teacher mode it is open with nothing won, and still shows its stars once won', () => {
    expect(flowerOf(emptySave(), true)[0]?.state).toEqual({ kind: 'open' });
    expect(flowerOf(saved({ '1.3': 1 }), true)[0]?.state).toEqual({ kind: 'won', stars: 1 });
  });

  it('the drafts of a chapter neither keep it unfinished nor give it stars', () => {
    const withDraft = [...CATALOG, { id: '1.4', draft: true }];
    const save = saved({ '1.1': 1, '1.2': 1, '1.4': 3 });
    expect(secretFlowers(withDraft, save, false)[0]?.state).toEqual({
      kind: 'bud',
      need: 3,
      have: 2,
    });
  });

  it('a catalog without flowers has none, and the flowers come in catalog order', () => {
    expect(secretFlowers(CATALOG.slice(0, 2), emptySave(), true)).toEqual([]);
    const two = [...CATALOG, { id: '2.2', draft: false, secret: { stars: 2 } }];
    expect(secretFlowers(two, emptySave(), true).map((flower) => flower.id)).toEqual([
      '1.3',
      '2.2',
    ]);
  });
});
