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
  notebook: [
    {
      prompt: 'ch1.5.notebook.00',
      codex: 'C2',
      options: [
        { line: 'ch1.5.notebook.01', correct: true },
        { line: 'ch1.5.notebook.02', correct: false, counterexample },
      ],
    },
  ],
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
        question: 0,
        option: 1,
        error: { code: 'badLanterns', error: { code: 'alreadyMatched', edge: [1, 2], vertex: 1 } },
      },
    ]);
  });

  it('checks the counterexamples of every question, telling which question each one refutes', () => {
    const level = levelWith(undefined);
    const [first] = level.notebook;
    const folding = { mode: 'play', ...row, actions: ['chain', 'fold'] };
    const second = {
      prompt: 'ch1.5.notebook.03',
      codex: 'C2',
      options: [
        { line: 'ch1.5.notebook.04', correct: false, counterexample: folding },
        { line: 'ch1.5.notebook.05', correct: true },
      ],
    };
    const asked = {
      ...level,
      flow: [...level.flow, { step: 'notebook', question: 1 }],
      solution: [...level.solution, { type: 'answer', option: 1 }],
      notebook: [first, second],
    };
    expect(notebookProblemsOf(asked)).toEqual([
      { code: 'counterexampleLocked', question: 1, option: 0, action: 'fold' },
    ]);
  });

  it('a counterexample is touched with tools the player already has in the level', () => {
    const folding = { mode: 'play', ...row, actions: ['chain', 'fold'] };
    expect(notebookProblemsOf(levelWith(folding))).toEqual([
      { code: 'counterexampleLocked', question: 0, option: 1, action: 'fold' },
    ]);
  });

  it('a counterexample may use a move the level knows but closes for the day in its own garden', () => {
    // 1.5 closes passing the lantern: a known move, so its counterexample may still use it.
    const closed = { ...levelWith({ mode: 'play', ...row, actions: ['chain', 'passLantern'] }) };
    expect(notebookProblemsOf({ ...closed, forbid: ['passLantern'] })).toEqual([]);
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
      { code: 'counterexampleUnbeatable', question: 0, option: 1 },
    ]);
  });

  it('a counterexample of bees and flowers joins only a bee and a flower', () => {
    const kinds = ['bee', 'flower', 'flower', 'bee'];
    const kinded = { ...row, sprouts: row.sprouts.map((s, i) => ({ ...s, kind: kinds[i] })) };
    expect(notebookProblemsOf(levelWith({ mode: 'play', ...kinded, actions: ['chain'] }))).toEqual([
      {
        code: 'counterexampleSameKindVine',
        question: 0,
        option: 1,
        u: 'b',
        v: 'c',
        kind: 'flower',
      },
    ]);
  });

  it('a counterexample reads as well as a level: no name drawn over another, no crossing vines', () => {
    const crowded = { ...row, sprouts: row.sprouts.map((s, i) => ({ ...s, x: 100 + 4 * i })) };
    const crossed = {
      ...row,
      sprouts: [
        { label: 'a', x: 100, y: 60 },
        { label: 'b', x: 200, y: 160 },
        { label: 'c', x: 200, y: 60 },
        { label: 'd', x: 100, y: 160 },
      ],
      vines: [
        ['a', 'b'],
        ['c', 'd'],
      ],
      lanterns: [],
    };
    const problems = notebookProblemsOf(
      levelWith({ mode: 'play', ...crowded, actions: ['chain'] }),
    );
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((problem) => problem.code === 'counterexampleLayout')).toBe(true);
    expect(problems).toContainEqual({
      code: 'counterexampleLayout',
      question: 0,
      option: 1,
      problem: { code: 'labelOnLabel', labels: ['a', 'b'] },
    });
    expect(notebookProblemsOf(levelWith({ mode: 'play', ...crossed, actions: ['chain'] }))).toEqual(
      [
        {
          code: 'counterexampleLayout',
          question: 0,
          option: 1,
          problem: {
            code: 'vinesCross',
            vines: [
              ['a', 'b'],
              ['c', 'd'],
            ],
          },
        },
      ],
    );
  });
});
