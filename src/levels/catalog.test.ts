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

  it('holds every level of the game, in order, all loaded', () => {
    expect(catalog().map((level) => level.data.id)).toEqual([
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
      '4.1',
      '4.3',
      '4.6',
      '4.7',
      '4.9',
      '4.10',
      '5.1',
      '7.2',
      '7.3',
      '7.4',
    ]);
  });
});
