import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { pondLevel } from '../../../tests/support/pondGarden';
import { hintedOption, questionAt } from './question';

/**
 * A star H–L1, H–L2, H–L3 plus a lone pair P–Q (most lanterns: 2) whose script is `flow`. The
 * level claims a goal of 4 lanterns: a bet must ignore it and ask the core. The reflection lights
 * H–L1 and P–Q, so the tangle with no lanterns of yours is those two pairs.
 */
const scripted = (flow: unknown[], extra: object = {}): Level => {
  const loaded = loadLevel({
    id: '1.6',
    sprouts: [
      { label: 'H', x: 100, y: 100 },
      { label: 'L1', x: 200, y: 60 },
      { label: 'L2', x: 200, y: 100 },
      { label: 'L3', x: 200, y: 140 },
      { label: 'P', x: 300, y: 100 },
      { label: 'Q', x: 400, y: 100 },
    ],
    vines: [
      ['H', 'L1'],
      ['H', 'L2'],
      ['H', 'L3'],
      ['P', 'Q'],
    ],
    mirror: [
      ['H', 'L1'],
      ['P', 'Q'],
    ],
    goal: { visible: true, value: 4 },
    flow,
    solution: [{ type: 'tapGarden' }],
    ...extra,
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

/** The lanterns the level starts with: none. */
const yours = (level: Level) => level.start.matching;

describe('the questions of a script', () => {
  it('the notebook offers its statements, by index; its right one is the true statement', () => {
    const notebook = {
      prompt: 'ch1.6.notebook.00',
      options: [
        { line: 'ch1.6.notebook.01', correct: false, reply: 'ch1.6.sauce.05' },
        { line: 'ch1.6.notebook.02', correct: true },
      ],
    };
    const level = scripted([{ step: 'notebook' }], { notebook });
    expect(questionAt(level, 0, yours(level))).toEqual({
      kind: 'notebook',
      step: 0,
      prompt: 'ch1.6.notebook.00',
      options: [
        { value: 0, line: 'ch1.6.notebook.01' },
        { value: 1, line: 'ch1.6.notebook.02' },
      ],
      right: [1],
      preview: null,
    });
  });

  it('an ask offers its written options, by index; its right ones are those marked right', () => {
    const level = scripted([
      {
        step: 'ask',
        prompt: 'ch1.6.sauce.01',
        options: [
          { line: 'ch1.6.sauce.02', correct: false },
          { line: 'ch1.6.sauce.03', correct: true },
          { line: 'ch1.6.sauce.04', correct: true },
        ],
      },
    ]);
    expect(questionAt(level, 0, yours(level))).toEqual({
      kind: 'ask',
      step: 0,
      prompt: 'ch1.6.sauce.01',
      options: [
        { value: 0, line: 'ch1.6.sauce.02' },
        { value: 1, line: 'ch1.6.sauce.03' },
        { value: 2, line: 'ch1.6.sauce.04' },
      ],
      right: [1, 2],
      preview: null,
    });
  });

  it('the right bet is the most lanterns the core finds, whatever the level file claims', () => {
    const level = scripted([{ step: 'bet', prompt: 'ch1.6.sauce.01', range: 5, preview: 3000 }]);
    const question = questionAt(level, 0, yours(level));
    expect(question?.options.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
    expect(question?.options.every((option) => option.line === null)).toBe(true);
    expect(question?.right).toEqual([2]);
    expect(question?.preview).toBe(3000);
  });

  it('a count offers 0 to its range, and the core counts the piece through the sprout', () => {
    const level = scripted([
      { step: 'count', prompt: 'ch1.6.sauce.01', piece: 'L1', of: 'mirror', range: 3 },
    ]);
    const question = questionAt(level, 0, yours(level));
    expect(question?.options.map((option) => option.value)).toEqual([0, 1, 2, 3]);
    expect(question?.right).toEqual([1]);
    expect(question?.preview).toBeNull();
  });

  it('2.2 counts each piece of the pond: the thread 2 yours and 3 its, the loop 2 and 2', () => {
    const count = (piece: string, of: 'yours' | 'mirror') =>
      ({ step: 'count', prompt: 'ch2.2.sauce.01', piece, of, range: 4 }) as const;
    const level = pondLevel([
      { step: 'mirror' },
      { step: 'separate' },
      count('1', 'yours'),
      count('6', 'mirror'),
      count('a', 'yours'),
      count('c', 'mirror'),
    ]);
    const rights = [2, 3, 4, 5].map((index) => questionAt(level, index, yours(level))?.right);
    expect(rights).toEqual([[2], [3], [2], [2]]);
  });

  it('a step that asks nothing, or past the end of the script, has no question', () => {
    const level = scripted([{ step: 'say', lines: ['ch1.6.sauce.01'] }]);
    expect(questionAt(level, 0, yours(level))).toBeNull();
    expect(questionAt(level, 1, yours(level))).toBeNull();
  });

  it('a hint may point at the right option of an ask or a count, never of a bet', () => {
    const level = scripted([
      {
        step: 'ask',
        prompt: 'ch1.6.sauce.01',
        options: [
          { line: 'ch1.6.sauce.02', correct: false },
          { line: 'ch1.6.sauce.03', correct: true },
        ],
      },
      { step: 'bet', prompt: 'ch1.6.sauce.01', range: 5 },
      { step: 'count', prompt: 'ch1.6.sauce.01', piece: 'P', of: 'mirror', range: 3 },
    ]);
    const at = (index: number) => {
      const question = questionAt(level, index, yours(level));
      if (question === null) throw new Error('no question');
      return hintedOption(question);
    };
    expect(at(0)).toBe(1);
    expect(at(1)).toBeNull();
    expect(at(2)).toBe(1);
  });
});
