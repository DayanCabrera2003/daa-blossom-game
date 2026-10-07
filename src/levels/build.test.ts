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

  it('turns the roots a search may start from into ids, any sprout in the dark by default', () => {
    expect(unwrapLevel({ ...rotate, roots: ['R'] }).start.roots).toEqual([0]);
    expect(unwrapLevel(rotate).start.roots).toBeNull();
  });

  it('turns the petals of the flower a level declares into ids, base first; none by default', () => {
    expect(unwrapLevel({ ...rotate, flower: ['b', 'c', 'd'] }).flower).toEqual([2, 3, 4]);
    expect(unwrapLevel(rotate).flower).toBeNull();
    expect(buildLevel({ ...rotate, flower: ['b', 'c', 'X'] })).toMatchObject({
      error: { code: 'badLabel', error: { name: 'X' } },
    });
  });

  it('turns the sprouts of a chain drawn in the walkthrough into ids', () => {
    const drawn = (path: string[]): LevelData => ({
      ...rotate,
      solution: [{ type: 'drawChain', path }],
    });
    expect(buildLevel(drawn(['e', 'c', 'X']))).toMatchObject({
      error: { code: 'badLabel', error: { name: 'X' } },
    });
    expect(unwrapLevel(drawn(['e', 'c', 'd', 'b'])).walkthrough).toEqual([
      { type: 'drawChain', path: [5, 3, 4, 2] },
    ]);
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
    expect(buildLevel({ ...rotate, roots: ['R', 'V'] })).toMatchObject({
      error: { code: 'badLabel', error: { name: 'V' } },
    });
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

describe('the walkthrough of a level', () => {
  const walked = levelSchema.parse({
    ...rotate,
    solution: [
      { type: 'answer', option: 1 },
      { type: 'rotateStem', stem: ['R', 'a', 'b'] },
      { type: 'tapSprout', vertex: 'c' },
      { type: 'drawMirror', lanterns: [['R', 'a']] },
      { type: 'chain', path: ['b', 'd', 'c', 'e'] },
      { type: 'checkMirror' },
    ],
  });

  it('keeps every entry in order, with ids', () => {
    expect(unwrapLevel(walked).walkthrough).toEqual([
      { type: 'answer', option: 1 },
      { type: 'rotateStem', stem: [0, 1, 2] },
      { type: 'tapSprout', vertex: 3 },
      { type: 'drawMirror', lanterns: [[0, 1]] },
      { type: 'chain', path: [2, 4, 3, 5] },
      { type: 'checkMirror' },
    ]);
  });

  it('gives the moves alone as the solution', () => {
    expect(unwrapLevel(walked).solution).toEqual([
      { type: 'rotateStem', stem: [0, 1, 2] },
      { type: 'chain', path: [2, 4, 3, 5] },
    ]);
  });

  it('says which sprout a script input names wrongly', () => {
    const tap = levelSchema.parse({ ...rotate, solution: [{ type: 'tapSprout', vertex: 'y' }] });
    expect(buildLevel(tap)).toMatchObject({ error: { code: 'badLabel', error: { name: 'y' } } });
    const draw = levelSchema.parse({
      ...rotate,
      solution: [{ type: 'drawMirror', lanterns: [['R', 'x']] }],
    });
    expect(buildLevel(draw)).toMatchObject({ error: { code: 'badLabel', error: { name: 'x' } } });
  });
});

describe('the script of a level', () => {
  it('is "play until won" when the level writes none', () => {
    expect(unwrapLevel(rotate).flow).toEqual([{ step: 'play', reactions: [] }]);
  });

  it('names sprouts by id: the piece a count asks about and the moves of a demo', () => {
    const scripted = levelSchema.parse({
      ...rotate,
      flow: [
        { step: 'say', lines: ['ch4.10.sauce.00'] },
        { step: 'replay', demo: [{ type: 'join', u: 'R', v: 'a' }] },
        { step: 'replay' },
        { step: 'count', prompt: 'ch4.10.sauce.02', piece: 'c', of: 'yours', range: 3 },
        { step: 'play' },
      ],
    });
    expect(unwrapLevel(scripted).flow).toEqual([
      { step: 'say', lines: ['ch4.10.sauce.00'] },
      { step: 'replay', demo: [{ type: 'join', u: 0, v: 1 }] },
      { step: 'replay' },
      { step: 'count', prompt: 'ch4.10.sauce.02', piece: 3, of: 'yours', range: 3 },
      { step: 'play', reactions: [] },
    ]);
  });

  it('says which name in the script is unknown', () => {
    const count = { step: 'count', prompt: 'ch4.10.sauce.02', piece: 'q', of: 'yours', range: 3 };
    expect(buildLevel(levelSchema.parse({ ...rotate, flow: [count] }))).toMatchObject({
      error: { code: 'badLabel', error: { name: 'q' } },
    });
    const demo = { step: 'replay', demo: [{ type: 'join', u: 'R', v: 'k' }] };
    expect(buildLevel(levelSchema.parse({ ...rotate, flow: [demo] }))).toMatchObject({
      error: { code: 'badLabel', error: { name: 'k' } },
    });
  });
});

describe('the reflection of a level', () => {
  it('is null when the level has none', () => {
    expect(unwrapLevel(rotate).mirror).toBeNull();
  });

  it('is built as a set of lanterns of the same garden', () => {
    const mirror = unwrapLevel({
      ...rotate,
      mirror: [
        ['R', 'a'],
        ['b', 'd'],
        ['c', 'e'],
      ],
    }).mirror;
    expect(mirror?.mate).toEqual([1, 0, 4, 5, 2, 3]);
  });

  it('rejects a reflection with two lanterns on one sprout, or on a missing vine', () => {
    const twice = {
      ...rotate,
      mirror: [
        ['a', 'b'],
        ['b', 'c'],
      ] as [string, string][],
    };
    expect(buildLevel(twice)).toMatchObject({
      error: { code: 'badMirror', error: { code: 'alreadyMatched', vertex: 2 } },
    });
    expect(buildLevel({ ...rotate, mirror: [['R', 'e']] })).toMatchObject({
      error: { code: 'badMirror', error: { code: 'notAnEdge' } },
    });
    expect(buildLevel({ ...rotate, mirror: [['R', 'Z']] })).toMatchObject({
      error: { code: 'badLabel', error: { name: 'Z' } },
    });
  });
});

/** The built level; a build error here is a test bug. */
function unwrapLevel(data: LevelData) {
  const result = buildLevel(data);
  if (!result.ok) throw new Error(`build failed: ${JSON.stringify(result.error)}`);
  return result.value;
}
