import { size } from '@core/matching/queries';
import { describe, expect, it } from 'vitest';
import { buildLevel } from './build';
import { levelSchema, type LevelData } from './schema';

/** Level 4.10 as a file: the festival garden, with folding closed for the day. */
const rotate: LevelData = levelSchema.parse({
  id: '4.10',
  sprouts: ['R', 'a', 'b', 'c', 'd', 'e'].map((label, i) => ({ label, x: 40 + 70 * i, y: 135 })),
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ['c', 'e'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  goal: { visible: true, value: 3 },
  forbid: ['fold', 'foldAt'],
  victory: { type: 'matchingSize', value: 3 },
  hints: [{ line: 'ch4.10.sauce.01', highlight: ['R', 'b'] }],
  solution: [
    { type: 'rotateStem', stem: ['R', 'a', 'b'] },
    { type: 'chain', path: ['b', 'd', 'c', 'e'] },
  ],
});

describe('building a level', () => {
  it('turns names into ids and sets up the garden it starts from', () => {
    const level = unwrapLevel(rotate);
    expect(level.graph.n).toBe(6);
    expect(level.graph.edges).toContainEqual([2, 4]);
    expect(size(level.start.matching)).toBe(2);
    expect(level.solution).toEqual([
      { type: 'rotateStem', stem: [0, 1, 2] },
      { type: 'chain', path: [2, 4, 3, 5] },
    ]);
  });

  it('turns the names each hint highlights into ids', () => {
    expect(unwrapLevel(rotate).hints).toEqual([{ line: 'ch4.10.sauce.01', highlight: [0, 2] }]);
  });

  it('allows what has been unlocked by this level, minus what it keeps closed', () => {
    const { allowed } = unwrapLevel(rotate).start;
    expect(allowed.has('rotateStem')).toBe(true);
    expect(allowed.has('unfold')).toBe(true);
    expect(allowed.has('fold')).toBe(false);
    expect(allowed.has('liftStone')).toBe(false);
  });

  it('carries fog over to the garden', () => {
    expect(unwrapLevel({ ...rotate, fog: true }).start.revealed).toEqual(new Array(6).fill(false));
  });

  it('says which name is unknown, wherever it appears', () => {
    expect(buildLevel({ ...rotate, vines: [['R', 'z']] })).toEqual({
      ok: false,
      error: { code: 'badLabel', error: { code: 'unknownName', name: 'z' } },
    });
    expect(buildLevel({ ...rotate, solution: [{ type: 'markRoot', vertex: 'Q' }] })).toMatchObject({
      error: { code: 'badLabel', error: { name: 'Q' } },
    });
    expect(
      buildLevel({ ...rotate, hints: [{ line: 'ch4.10.sauce.01', highlight: ['W'] }] }),
    ).toMatchObject({ error: { code: 'badLabel', error: { name: 'W' } } });
  });

  it('also finds unknown names inside paths and among the starting lanterns', () => {
    expect(
      buildLevel({ ...rotate, solution: [{ type: 'chain', path: ['R', 'a', 'X'] }] }),
    ).toMatchObject({ error: { code: 'badLabel', error: { name: 'X' } } });
    expect(buildLevel({ ...rotate, lanterns: [['a', 'Y']] })).toMatchObject({
      error: { code: 'badLabel', error: { name: 'Y' } },
    });
  });

  it('rejects repeated sprout names', () => {
    const twins = { ...rotate, sprouts: [rotate.sprouts[0], rotate.sprouts[0]] } as LevelData;
    expect(buildLevel(twins)).toMatchObject({
      error: { code: 'badLabel', error: { code: 'duplicateName', name: 'R' } },
    });
  });

  it('rejects a garden or lanterns that break the rules', () => {
    expect(buildLevel({ ...rotate, vines: [...rotate.vines, ['a', 'R']] })).toMatchObject({
      error: { code: 'badGraph' },
    });
    expect(buildLevel({ ...rotate, lanterns: [['R', 'c']] })).toMatchObject({
      error: { code: 'badLanterns', error: { code: 'notAnEdge' } },
    });
  });
});

/** The built level; a build error here is a test bug. */
function unwrapLevel(data: LevelData) {
  const result = buildLevel(data);
  if (!result.ok) throw new Error(`build failed: ${JSON.stringify(result.error)}`);
  return result.value;
}
