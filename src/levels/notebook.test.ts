import { describe, expect, it } from 'vitest';
import { notebookSchema } from './notebook';

/** A row of three sprouts, the smallest garden a counterexample is written with here. */
const row = {
  line: 'ch1.5.sauce.01',
  sprouts: [
    { label: 'a', x: 100, y: 100 },
    { label: 'b', x: 150, y: 100 },
    { label: 'c', x: 200, y: 100 },
  ],
  vines: [
    ['a', 'b'],
    ['b', 'c'],
  ],
};

/** A notebook whose second (wrong) option carries `counterexample`. */
const withCounterexample = (counterexample: unknown) => ({
  prompt: 'ch1.5.notebook.00',
  options: [
    { line: 'ch1.5.notebook.01', correct: true },
    { line: 'ch1.5.notebook.02', correct: false, counterexample },
  ],
});

describe('the notebook schema', () => {
  it('a wrong option may carry a garden to play with, its lanterns off by default', () => {
    const parsed = notebookSchema.parse(
      withCounterexample({ mode: 'play', ...row, actions: ['chain'] }),
    );
    expect(parsed.options[1]?.counterexample).toEqual({
      mode: 'play',
      ...row,
      lanterns: [],
      actions: ['chain'],
    });
  });

  it('a garden to play with needs at least one action', () => {
    const parsed = notebookSchema.safeParse(
      withCounterexample({ mode: 'play', ...row, actions: [] }),
    );
    expect(parsed.success).toBe(false);
  });

  it('a garden to draw a reflection on takes no actions, and says a line when the chain shows', () => {
    const drawn = { mode: 'mirrorDraw', ...row, found: 'ch2.4.sauce.05' };
    expect(notebookSchema.safeParse(withCounterexample(drawn)).success).toBe(true);
    const withActions = { ...drawn, actions: ['chain'] };
    expect(notebookSchema.safeParse(withCounterexample(withActions)).success).toBe(false);
  });

  it('a right option is never refuted', () => {
    const notebook = {
      prompt: 'ch1.5.notebook.00',
      options: [
        {
          line: 'ch1.5.notebook.01',
          correct: true,
          counterexample: { mode: 'play', ...row, actions: ['chain'] },
        },
        { line: 'ch1.5.notebook.02', correct: false },
      ],
    };
    expect(notebookSchema.safeParse(notebook).success).toBe(false);
  });

  it('any option may carry what the mentor answers to it', () => {
    const notebook = {
      prompt: 'ch1.5.notebook.00',
      options: [
        { line: 'ch1.5.notebook.01', correct: true },
        { line: 'ch1.5.notebook.02', correct: false, reply: 'ch1.5.sauce.04' },
      ],
    };
    expect(notebookSchema.parse(notebook).options[1]?.reply).toBe('ch1.5.sauce.04');
  });

  it('the sprouts of a counterexample stay inside the garden area, as a level’s do', () => {
    const outside = { ...row, sprouts: [{ label: 'a', x: 100, y: 250 }] };
    const parsed = notebookSchema.safeParse(
      withCounterexample({ mode: 'play', ...outside, actions: ['chain'] }),
    );
    expect(parsed.success).toBe(false);
  });

  it('a counterexample with bees and flowers says what every one of its sprouts is', () => {
    const [a, b, c] = row.sprouts;
    const kinds = (sprouts: unknown[]) =>
      notebookSchema.safeParse(
        withCounterexample({ mode: 'play', ...row, sprouts, actions: ['chain'] }),
      ).success;
    expect(
      kinds([
        { ...a, kind: 'bee' },
        { ...b, kind: 'flower' },
        { ...c, kind: 'bee' },
      ]),
    ).toBe(true);
    expect(kinds([{ ...a, kind: 'bee' }, b, c])).toBe(false);
  });
});
