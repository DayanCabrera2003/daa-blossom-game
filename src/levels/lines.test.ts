import { describe, expect, it } from 'vitest';
import { referencedLines } from './lines';
import { levelSchema } from './schema';

/** A level that speaks in its script, its hints and its notebook. */
const talkative = levelSchema.parse({
  id: '4.7',
  sprouts: [
    { label: 'A', x: 200, y: 135 },
    { label: 'B', x: 280, y: 135 },
  ],
  vines: [['A', 'B']],
  goal: { visible: true, value: 1 },
  victory: { type: 'matchingSize', value: 1 },
  hints: [{ line: 'ch4.7.sauce.01' }, { line: 'ch4.7.sauce.02', highlight: ['A'] }],
  flow: [{ step: 'say', lines: ['ch4.7.sauce.00', 'ch4.7.sauce.01'] }, { step: 'play' }],
  notebook: {
    prompt: 'ch4.7.notebook.00',
    options: [
      { line: 'ch4.7.notebook.01', correct: true },
      { line: 'ch4.7.notebook.02', correct: false },
    ],
  },
  solution: [{ type: 'join', u: 'A', v: 'B' }],
});

describe('referencedLines', () => {
  it('lists every line a level speaks, script, hints and notebook, once each', () => {
    expect(referencedLines(talkative)).toEqual([
      'ch4.7.sauce.00',
      'ch4.7.sauce.01',
      'ch4.7.sauce.02',
      'ch4.7.notebook.00',
      'ch4.7.notebook.01',
      'ch4.7.notebook.02',
    ]);
  });

  it('lists what the notebook says: each statement, its reply and the lines of its garden', () => {
    const garden = {
      sprouts: [{ label: 'a', x: 100, y: 100 }],
      vines: [],
    };
    const refuted = levelSchema.parse({
      ...talkative,
      hints: [],
      flow: [{ step: 'play' }],
      notebook: {
        prompt: 'ch4.7.notebook.00',
        options: [
          { line: 'ch4.7.notebook.01', correct: true, reply: 'ch4.7.sauce.05' },
          {
            line: 'ch4.7.notebook.02',
            correct: false,
            counterexample: { mode: 'play', line: 'ch4.7.sauce.06', ...garden, actions: ['join'] },
          },
          {
            line: 'ch4.7.notebook.03',
            correct: false,
            reply: 'ch4.7.sauce.07',
            counterexample: {
              mode: 'mirrorDraw',
              line: 'ch4.7.sauce.08',
              found: 'ch4.7.sauce.09',
              ...garden,
            },
          },
        ],
      },
    });
    expect(referencedLines(refuted)).toEqual([
      'ch4.7.notebook.00',
      'ch4.7.notebook.01',
      'ch4.7.sauce.05',
      'ch4.7.notebook.02',
      'ch4.7.sauce.06',
      'ch4.7.notebook.03',
      'ch4.7.sauce.07',
      'ch4.7.sauce.08',
      'ch4.7.sauce.09',
    ]);
  });

  it('lists the lines of the script, in the order its steps come', () => {
    const scripted = levelSchema.parse({
      ...talkative,
      notebook: undefined,
      hints: [{ line: 'ch4.7.sauce.09' }],
      flow: [
        { step: 'say', lines: ['ch4.7.sauce.00', 'ch4.7.sauce.01'] },
        {
          step: 'play',
          reactions: [
            { on: 'gainZeroChain', say: ['ch4.7.sauce.02'] },
            { on: 'lanterns', value: 1, say: ['ch4.7.sauce.03'] },
          ],
        },
        {
          step: 'ask',
          prompt: 'ch4.7.sauce.04',
          options: [
            { line: 'ch4.7.sauce.05', correct: true, reply: 'ch4.7.sauce.06' },
            { line: 'ch4.7.sauce.07', correct: false },
          ],
        },
        { step: 'bet', prompt: 'ch4.7.sauce.08', range: 3 },
        { step: 'count', prompt: 'ch4.7.sauce.10', piece: 'A', of: 'yours', range: 2 },
        { step: 'sun' },
      ],
    });
    expect(referencedLines(scripted)).toEqual([
      'ch4.7.sauce.00',
      'ch4.7.sauce.01',
      'ch4.7.sauce.02',
      'ch4.7.sauce.03',
      'ch4.7.sauce.04',
      'ch4.7.sauce.05',
      'ch4.7.sauce.06',
      'ch4.7.sauce.07',
      'ch4.7.sauce.08',
      'ch4.7.sauce.10',
      'ch4.7.sauce.09',
    ]);
  });

  it('is empty for a level that says nothing', () => {
    const silent = {
      ...talkative,
      hints: [],
      flow: [{ step: 'play' as const, reactions: [] }],
      notebook: undefined,
    };
    expect(referencedLines(silent)).toEqual([]);
  });
});
