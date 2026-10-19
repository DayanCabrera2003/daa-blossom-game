import { size } from '@core/matching/queries';
import { applyAction } from '@core/rules/applyAction';
import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { buildCounterexample, counterexampleAt, refutationAt } from './counterexample';
import { loadLevel } from './loader';
import { counterexampleSchema } from './notebook';

/** Four sprouts in a row with the middle pair lit: a chain from end to end lights one more. */
const rowOfFour = {
  line: 'ch1.5.sauce.01',
  sprouts: ['a', 'b', 'c', 'd'].map((label, i) => ({ label, x: 100 + 60 * i, y: 120 })),
  vines: [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
  ],
  lanterns: [['b', 'c']],
};

const built = (json: unknown) => buildCounterexample(counterexampleSchema.parse(json));

describe('building a counterexample', () => {
  it('a garden to play with is a core garden with its lanterns and only its actions', () => {
    const result = built({ mode: 'play', ...rowOfFour, actions: ['chain'] });
    if (!result.ok) throw new Error('the row should build');
    const { start, labels, line, found, mode } = result.value;
    expect({ mode, line, found }).toEqual({ mode: 'play', line: 'ch1.5.sauce.01', found: null });
    expect(start.graph.n).toBe(4);
    expect(size(start.matching)).toBe(1);
    expect([...start.allowed]).toEqual(['chain']);
    expect(labels.names).toEqual(['a', 'b', 'c', 'd']);
  });

  it('plays by the same rules as a level: the chain is accepted, a locked move is not', () => {
    const result = built({ mode: 'play', ...rowOfFour, actions: ['chain'] });
    if (!result.ok) throw new Error('the row should build');
    const chained = applyAction(result.value.start, { type: 'chain', path: [0, 1, 2, 3] });
    expect(chained.ok && size(chained.state.matching)).toBe(2);
    const joined = applyAction(result.value.start, { type: 'join', u: 0, v: 1 });
    expect(joined).toEqual({ ok: false, reason: { code: 'actionLocked', action: 'join' } });
  });

  it('a garden to draw a reflection on takes no garden moves, and keeps the line of its chain', () => {
    const result = built({ mode: 'mirrorDraw', ...rowOfFour, found: 'ch2.4.sauce.05' });
    if (!result.ok) throw new Error('the row should build');
    expect(result.value.found).toBe('ch2.4.sauce.05');
    expect(result.value.start.allowed.size).toBe(0);
    expect(size(result.value.start.matching)).toBe(1);
  });

  it('a counterexample that is no garden is reported, as a level would be', () => {
    const twoLanternsOnB = {
      ...rowOfFour,
      lanterns: [
        ['a', 'b'],
        ['b', 'c'],
      ],
    };
    expect(built({ mode: 'play', ...twoLanternsOnB, actions: ['chain'] })).toMatchObject({
      ok: false,
      error: { code: 'badLanterns' },
    });
    const unknown = { ...rowOfFour, vines: [['a', 'z']] };
    expect(built({ mode: 'play', ...unknown, actions: ['chain'] })).toMatchObject({
      ok: false,
      error: { code: 'badLabel' },
    });
  });
});

describe('the counterexample of a statement', () => {
  const byId = (id: string) => {
    const level = catalog().find((candidate) => candidate.data.id === id);
    if (level === undefined) throw new Error(`no level ${id}`);
    return level;
  };

  it('is built from the level’s notebook, for the false statements that carry one', () => {
    const level = byId('1.5');
    expect(counterexampleAt(level, 0, 1)?.start.graph.n).toBe(6);
    expect(counterexampleAt(level, 0, 2)?.start.graph.n).toBe(10);
  });

  it('is none for a true statement, a statement or question not on offer, or no notebook', () => {
    expect(counterexampleAt(byId('1.5'), 0, 0)).toBeNull();
    expect(counterexampleAt(byId('1.5'), 0, 7)).toBeNull();
    expect(counterexampleAt(byId('1.5'), 1, 1)).toBeNull();
    expect(counterexampleAt(byId('0.1'), 0, 1)).toBeNull();
  });
});

describe('the garden that refutes an answer chosen at a step of the script', () => {
  const byId = (id: string) => {
    const level = catalog().find((candidate) => candidate.data.id === id);
    if (level === undefined) throw new Error(`no level ${id}`);
    return level;
  };

  /** Two sprouts, then a question whose second answer is refuted by a row of four. */
  const asking = loadLevel({
    id: '1.5',
    sprouts: [
      { label: 'A', x: 200, y: 135 },
      { label: 'B', x: 280, y: 135 },
    ],
    vines: [['A', 'B']],
    goal: { visible: true, value: 1 },
    victory: { type: 'matchingSize', value: 1 },
    flow: [
      { step: 'play' },
      {
        step: 'ask',
        prompt: 'ch1.5.sauce.05',
        options: [
          { line: 'ch1.5.sauce.06', correct: true },
          {
            line: 'ch1.5.sauce.07',
            correct: false,
            counterexample: { mode: 'play', ...rowOfFour, actions: ['chain'] },
          },
        ],
        retry: true,
      },
    ],
    solution: [
      { type: 'join', u: 'A', v: 'B' },
      { type: 'answer', option: 0 },
    ],
  });

  it('a notebook step opens the garden of its notebook question, under its prompt', () => {
    const refuted = refutationAt(byId('1.5'), 2, 1);
    expect(refuted).toMatchObject({
      asker: 'notebook',
      prompt: 'ch1.5.notebook.00',
      statement: 'ch1.5.notebook.02',
    });
    expect(refuted?.counterexample.start.graph.n).toBe(6);
  });

  it('a question of the script opens the garden of its own answer', () => {
    if (!asking.ok) throw new Error('the level does not load');
    const refuted = refutationAt(asking.value, 1, 1);
    expect(refuted).toMatchObject({
      asker: 'ask',
      prompt: 'ch1.5.sauce.05',
      statement: 'ch1.5.sauce.07',
    });
    expect(refuted?.counterexample.start.graph.n).toBe(4);
  });

  it('is none for a right answer, a step that asks nothing or one not in the script', () => {
    if (!asking.ok) throw new Error('the level does not load');
    expect(refutationAt(asking.value, 1, 0)).toBeNull();
    expect(refutationAt(asking.value, 0, 1)).toBeNull();
    expect(refutationAt(asking.value, 9, 1)).toBeNull();
    expect(refutationAt(byId('1.5'), 2, 0)).toBeNull();
  });
});
