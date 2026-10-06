import { describe, expect, it } from 'vitest';
import { referencedLines } from './lines';
import { levelSchema } from './schema';

/** A level that speaks in every place a level can: script, hints and notebook. */
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
  script: ['ch4.7.sauce.00', 'ch4.7.sauce.01'],
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

  it('is empty for a level that says nothing', () => {
    const silent = { ...talkative, hints: [], script: [], notebook: undefined };
    expect(referencedLines(silent)).toEqual([]);
  });
});
