import { describe, expect, it } from 'vitest';
import { buildCatalog, catalog, compareLevelIds } from './catalog';

/** A minimal valid level file with the given id. */
const levelFile = (id: string) => ({
  id,
  sprouts: [
    { label: 'A', x: 50, y: 100 },
    { label: 'B', x: 100, y: 100 },
  ],
  vines: [['A', 'B']],
  goal: { visible: true, value: 1 },
  victory: { type: 'matchingSize', value: 1 },
  solution: [{ type: 'join', u: 'A', v: 'B' }],
});

describe('level ids in play order', () => {
  it('compares chapter first, then level, as numbers', () => {
    const ids = ['4.10', '1.1', '4.9', '0.1', '10.2', '4.1'];
    expect([...ids].sort(compareLevelIds)).toEqual(['0.1', '1.1', '4.1', '4.9', '4.10', '10.2']);
  });
});

describe('the level catalog', () => {
  it('loads level files and puts them in play order', () => {
    const result = buildCatalog([levelFile('4.10'), levelFile('0.1'), levelFile('4.9')]);
    expect(result.ok && result.value.map((level) => level.data.id)).toEqual(['0.1', '4.9', '4.10']);
  });

  it('says which file does not load, and why', () => {
    expect(buildCatalog([levelFile('0.1'), { id: 'oops' }])).toMatchObject({
      ok: false,
      error: { index: 1, error: { code: 'schema' } },
    });
  });

  it('holds every level of the game, all loaded, each id once, in play order', () => {
    const ids = catalog().map((level) => level.data.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort(compareLevelIds)).toEqual(ids);
  });

  it('holds the written chapters 0 to 5 whole, with no draft among them', () => {
    const early = catalog().filter((level) => compareLevelIds(level.data.id, '6.0') < 0);
    expect(early.map((level) => level.data.id)).toEqual([
      '0.1',
      '0.2',
      '0.3',
      '0.4',
      '0.5',
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '1.8',
      '1.9',
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '3.1',
      '3.2',
      '3.3',
      '3.4',
      '3.5',
      '3.6',
      '3.7',
      '3.8',
      '3.9',
      '4.1',
      '4.2',
      '4.3',
      '4.4',
      '4.5',
      '4.6',
      '4.7',
      '4.8',
      '4.9',
      '4.10',
      '4.11',
      '4.12',
      '5.1',
      '5.2',
      '5.3',
      '5.4',
      '5.5',
    ]);
    expect(early.filter((level) => level.data.draft)).toEqual([]);
  });

  it('keeps drafts only in chapters not yet written, all after the written ones', () => {
    const chapterOf = (id: string) => Number(id.split('.')[0]);
    const chapters = (draft: boolean) =>
      new Set(
        catalog()
          .filter((level) => level.data.draft === draft)
          .map((level) => chapterOf(level.data.id)),
      );
    const drafted = chapters(true);
    const written = chapters(false);
    expect([...drafted].filter((chapter) => written.has(chapter))).toEqual([]);
    for (const chapter of drafted) expect(chapter).toBeGreaterThan(Math.max(...written));
  });
});
