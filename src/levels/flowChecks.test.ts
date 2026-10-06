import { describe, expect, it } from 'vitest';
import { checkFlow } from './flowChecks';
import { loadLevel } from './loader';

/**
 * A pond in the style of 2.1: the path A…F with your lanterns B=C and D=E, the reflection lighting
 * A=B, C=D and E=F, and a pair G=H lit on both sides (it vanishes from the tangle).
 */
const pond = {
  id: '2.1',
  sprouts: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, i) => ({
    label,
    x: 40 + 50 * i,
    y: 135,
  })),
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'E'],
    ['E', 'F'],
    ['G', 'H'],
  ],
  lanterns: [
    ['B', 'C'],
    ['D', 'E'],
    ['G', 'H'],
  ],
  mirror: [
    ['A', 'B'],
    ['C', 'D'],
    ['E', 'F'],
    ['G', 'H'],
  ],
  goal: { visible: false },
  flow: [{ step: 'mirror' }, { step: 'separate' }],
  solution: [{ type: 'tapGarden' }],
};

/** The script problems of a level file that must load. */
const flowProblemsOf = (json: unknown) => {
  const level = loadLevel(json);
  if (!level.ok) throw new Error(`level does not load: ${JSON.stringify(level.error)}`);
  return checkFlow(level.value);
};

const count = (piece: string) => ({
  step: 'count',
  prompt: 'ch2.1.sauce.01',
  piece,
  of: 'mirror',
  range: 3,
});

describe('the checks of a level script', () => {
  it('a sound script has no problems', () => {
    const sound = {
      ...pond,
      flow: [
        ...pond.flow,
        count('C'),
        {
          step: 'ask',
          prompt: 'ch2.1.sauce.01',
          options: [
            { line: 'ch2.1.sauce.02', correct: true },
            { line: 'ch2.1.sauce.03', correct: false },
          ],
        },
        { step: 'replay' },
        { step: 'replay', demo: [{ type: 'chain', path: ['A', 'B', 'C', 'D', 'E', 'F'] }] },
        { step: 'notebook' },
      ],
      notebook: {
        prompt: 'ch2.1.notebook.00',
        options: [
          { line: 'ch2.1.notebook.01', correct: true },
          { line: 'ch2.1.notebook.02', correct: false },
        ],
      },
    };
    expect(flowProblemsOf(sound)).toEqual([]);
  });

  it('a question needs a right answer', () => {
    const ask = {
      step: 'ask',
      prompt: 'ch2.1.sauce.01',
      options: [
        { line: 'ch2.1.sauce.02', correct: false },
        { line: 'ch2.1.sauce.03', correct: false },
      ],
    };
    expect(flowProblemsOf({ ...pond, flow: [{ step: 'mirror' }, ask] })).toEqual([
      { code: 'noCorrectOption', step: 1 },
    ]);
  });

  it('a notebook step needs the notebook question of the level', () => {
    expect(flowProblemsOf({ ...pond, flow: [{ step: 'notebook' }] })).toEqual([
      { code: 'notebookMissing', step: 0 },
    ]);
  });

  it('the steps that show the reflection need one', () => {
    expect(
      flowProblemsOf({
        ...pond,
        mirror: undefined,
        flow: [{ step: 'mirror' }, { step: 'explore' }, count('A')],
      }),
    ).toEqual([
      { code: 'mirrorMissing', step: 0 },
      { code: 'mirrorMissing', step: 1 },
      { code: 'mirrorMissing', step: 2 },
    ]);
  });

  it('a count asks about a sprout inside some thread or loop of the tangle', () => {
    expect(flowProblemsOf({ ...pond, flow: [count('A'), count('G')] })).toEqual([
      { code: 'pieceOutsideTangle', step: 1, sprout: 'G' },
    ]);
  });

  it('after a play step, the tangle is made with the lanterns the solution leaves', () => {
    // G=H is lit on both sides at the start, so G is in no piece; the solution puts it out.
    const played = {
      ...pond,
      victory: { type: 'matchingSize', value: 2 },
      flow: [{ step: 'play' }, count('G')],
      solution: [{ type: 'split', u: 'G', v: 'H' }],
    };
    expect(flowProblemsOf(played)).toEqual([]);
    const beforePlay = { ...played, flow: [count('G'), { step: 'play' }] };
    expect(flowProblemsOf(beforePlay)).toEqual([
      { code: 'pieceOutsideTangle', step: 0, sprout: 'G' },
    ]);
  });

  it('the mirror challenge needs lanterns that a better reflection can beat', () => {
    // The pond's lanterns leave the chain A…F; A=B, C=D, E=F and G=H leave none to find.
    expect(flowProblemsOf({ ...pond, flow: [{ step: 'draw', attempts: 3 }] })).toEqual([]);
    const full = [
      ['A', 'B'],
      ['C', 'D'],
      ['E', 'F'],
      ['G', 'H'],
    ];
    expect(
      flowProblemsOf({ ...pond, lanterns: full, flow: [{ step: 'draw', attempts: 3 }] }),
    ).toEqual([{ code: 'drawUnbeatable', step: 0 }]);
  });

  it('a bet offers the most lanterns the garden holds among its numbers, 1 to its range', () => {
    // The pond holds 4 lanterns: three on the path A…F and G=H.
    const bet = (range: number) => ({ step: 'bet', prompt: 'ch2.1.sauce.01', range });
    expect(flowProblemsOf({ ...pond, flow: [bet(4)] })).toEqual([]);
    expect(flowProblemsOf({ ...pond, flow: [{ step: 'mirror' }, bet(3)] })).toEqual([
      { code: 'betOutOfRange', step: 1, range: 3, optimum: 4 },
    ]);
  });

  it('a bet on a garden that holds no lantern can never be won', () => {
    const bare = { ...pond, vines: [], lanterns: [], mirror: undefined };
    const bet = { step: 'bet', prompt: 'ch2.1.sauce.01', range: 2 };
    expect(flowProblemsOf({ ...bare, flow: [bet] })).toEqual([
      { code: 'betOutOfRange', step: 0, range: 2, optimum: 0 },
    ]);
  });

  it('a demo is replayed from the start of the level, with every action allowed', () => {
    const demo = {
      step: 'replay',
      demo: [
        { type: 'chain', path: ['A', 'B', 'C', 'D', 'E', 'F'] },
        { type: 'join', u: 'A', v: 'C' },
      ],
    };
    expect(flowProblemsOf({ ...pond, flow: [{ step: 'mirror' }, demo] })).toEqual([
      { code: 'demoRefused', step: 1, move: 1, reason: { code: 'notAdjacent', u: 0, v: 2 } },
    ]);
  });
});
