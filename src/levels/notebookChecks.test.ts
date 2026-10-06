import { describe, expect, it } from 'vitest';
import { loadLevel } from './loader';
import { checkNotebook } from './notebookChecks';

/** Four sprouts in a row, the middle pair lit: one chain short of the most lanterns it holds. */
const row = {
  line: 'ch1.5.sauce.01',
  sprouts: ['a', 'b', 'c', 'd'].map((label, i) => ({ label, x: 100 + 60 * i, y: 120 })),
  vines: [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
  ],
  lanterns: [['b', 'c']],
};

/** Level 1.5 in small: two sprouts, then the notebook, its second statement refuted by `garden`. */
const levelWith = (counterexample: unknown) => ({
  id: '1.5',
  sprouts: [
    { label: 'A', x: 200, y: 135 },
    { label: 'B', x: 280, y: 135 },
  ],
  vines: [['A', 'B']],
  goal: { visible: true, value: 1 },
  victory: { type: 'matchingSize', value: 1 },
  flow: [{ step: 'play' }, { step: 'notebook' }],
  notebook: {
    prompt: 'ch1.5.notebook.00',
    options: [
      { line: 'ch1.5.notebook.01', correct: true },
      { line: 'ch1.5.notebook.02', correct: false, counterexample },
    ],
  },
  solution: [
    { type: 'join', u: 'A', v: 'B' },
    { type: 'answer', option: 0 },
  ],
});

/** The notebook problems of a level file that must load. */
const notebookProblemsOf = (json: unknown) => {
  const level = loadLevel(json);
  if (!level.ok) throw new Error(`level does not load: ${JSON.stringify(level.error)}`);
  return checkNotebook(level.value);
};

describe('the checks of a notebook', () => {
  it('a level without a notebook, or with sound counterexamples, has no problems', () => {
    const plain = { ...levelWith(undefined), notebook: undefined, flow: [{ step: 'play' }] };
    expect(notebookProblemsOf(plain)).toEqual([]);
    expect(notebookProblemsOf(levelWith({ mode: 'play', ...row, actions: ['chain'] }))).toEqual([]);
    const drawn = { mode: 'mirrorDraw', ...row, found: 'ch1.5.sauce.02' };
    expect(notebookProblemsOf(levelWith(drawn))).toEqual([]);
  });

  it('each counterexample must be a garden', () => {
    const twoOnB = {
      ...row,
      lanterns: [
        ['a', 'b'],
        ['b', 'c'],
      ],
    };
    expect(notebookProblemsOf(levelWith({ mode: 'play', ...twoOnB, actions: ['chain'] }))).toEqual([
      {
        code: 'badCounterexample',
        option: 1,
        error: { code: 'badLanterns', error: { code: 'alreadyMatched', edge: [1, 2], vertex: 1 } },
      },
    ]);
  });

  it('a counterexample is touched with tools the player already has in the level', () => {
    const folding = { mode: 'play', ...row, actions: ['chain', 'fold'] };
    expect(notebookProblemsOf(levelWith(folding))).toEqual([
      { code: 'counterexampleLocked', option: 1, action: 'fold' },
    ]);
  });

  it('a garden to draw a better reflection on must have one to find', () => {
    const full = {
      ...row,
      lanterns: [
        ['a', 'b'],
        ['c', 'd'],
      ],
    };
    const drawn = { mode: 'mirrorDraw', ...full, found: 'ch1.5.sauce.02' };
    expect(notebookProblemsOf(levelWith(drawn))).toEqual([
      { code: 'counterexampleUnbeatable', option: 1 },
    ]);
  });
});
