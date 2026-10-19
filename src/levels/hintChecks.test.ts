import { describe, expect, it } from 'vitest';
import { buildLevel, type Level } from './build';
import { checkHints } from './hintChecks';
import { levelSchema } from './schema';

/**
 * A festival garden as a file: R–a=b, triangle b–c=d–b, c–e, and f hanging from d (so the chain
 * is not the whole garden); won by the chain through the flower.
 */
const festival = {
  id: '4.5',
  sprouts: ['R', 'a', 'b', 'c', 'd', 'e', 'f'].map((label, i) => ({
    label,
    x: 40 + 60 * i,
    y: 135,
  })),
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ['c', 'e'],
    ['d', 'f'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  roots: ['R'],
  goal: { visible: true, value: 3 },
  victory: { type: 'matchingSize', value: 3 },
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
    { type: 'foldAt', from: 'd', to: 'b' },
    { type: 'markMoon', from: 'c', to: 'e' },
    { type: 'unfold', blossom: 0 },
    { type: 'chain', path: ['R', 'a', 'b', 'd', 'c', 'e'] },
  ],
};

/** The level a file builds, with `highlight` lit up by its grade-2 hint. */
const level = (highlight: readonly string[] | null, overrides: object = {}): Level => {
  const hints =
    highlight === null
      ? [{ line: 'ch4.5.sauce.01' }]
      : [{ line: 'ch4.5.sauce.01' }, { line: 'ch4.5.sauce.02', highlight }];
  const built = buildLevel(levelSchema.parse({ ...festival, hints, ...overrides }));
  if (!built.ok) throw new Error(`level does not build: ${JSON.stringify(built.error)}`);
  return built.value;
};

const reveals = (part: string) => [{ code: 'hintReveals', line: 'ch4.5.sauce.02', reveals: part }];

describe('hintReveals: grade 2 never lights up the answer (plan 10, phase 5)', () => {
  it('not the vine of a fold, in either order', () => {
    expect(checkHints(level(['b', 'd']))).toEqual(reveals('fold'));
    expect(checkHints(level(['d', 'b']))).toEqual(reveals('fold'));
  });

  it('not the whole chain, nor its two ends', () => {
    expect(checkHints(level(['R', 'a', 'b', 'c', 'd', 'e']))).toEqual(reveals('chain'));
    expect(checkHints(level(['e', 'R']))).toEqual(reveals('chainEnds'));
  });

  it('not the two sprouts of a join, a chain of one vine', () => {
    const joined = { solution: [{ type: 'join', u: 'R', v: 'a' }], lanterns: [['c', 'd']] };
    expect(checkHints(level(['R', 'a'], { ...joined, victory: { type: 'maximum' } }))).toEqual(
      reveals('chain'),
    );
  });

  it('not the stem to turn', () => {
    const turned = {
      chains: { rule: 'any' },
      solution: [
        { type: 'rotateStem', stem: ['R', 'a', 'b'] },
        { type: 'chain', path: ['b', 'd', 'c', 'e'] },
      ],
    };
    expect(checkHints(level(['R', 'a', 'b'], { ...turned, id: '4.10' }))).toEqual(reveals('stem'));
  });

  it('not two or more scarecrows of the final certificate', () => {
    const guarded = {
      id: '3.7',
      roots: undefined,
      goal: { visible: false },
      victory: { type: 'coverCertificate' },
      solution: [
        { type: 'placeScarecrow', vertex: 'b' },
        { type: 'placeScarecrow', vertex: 'c' },
        { type: 'declareDone' },
      ],
      lanterns: [
        ['a', 'b'],
        ['c', 'e'],
      ],
      vines: [
        ['R', 'b'],
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['c', 'e'],
        ['d', 'f'],
      ],
    };
    expect(checkHints(level(['b', 'c'], guarded))).toEqual(reveals('certificate'));
    expect(checkHints(level(['b', 'c', 'd'], guarded))).toEqual([]);
    expect(checkHints(level(['c'], guarded))).toEqual([]);
  });

  it('a wider zone, a single sprout, the whole garden or no grade 2 at all are fine', () => {
    expect(checkHints(level(['b', 'c', 'd']))).toEqual([]);
    expect(checkHints(level(['b']))).toEqual([]);
    expect(checkHints(level(['R', 'a', 'b', 'c', 'd', 'e', 'f']))).toEqual([]);
    expect(checkHints(level([]))).toEqual([]);
    expect(checkHints(level(null))).toEqual([]);
  });
});
