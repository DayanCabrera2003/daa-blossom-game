import { describe, expect, it } from 'vitest';
import { BLOOM } from '../../tests/support/fixtureLevels';
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

/**
 * The garden of 4.1 searched from R alone, as 4.2 does: R sun, a moon, b sun, c moon, d sun, and
 * d–b closes the loop b, c, d. No reflection: the loop needs none to be counted.
 */
const betrayal = {
  id: '4.2',
  sprouts: ['R', 'a', 'b', 'c', 'd', 'e'].map((label, i) => ({ label, x: 40 + 60 * i, y: 135 })),
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
  roots: ['R'],
  goal: { visible: true, value: 3 },
  victory: { type: 'searchComplete' },
  flow: [{ step: 'play' }],
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
  ],
};

const loopCount = { step: 'count', prompt: 'ch4.2.sauce.01', of: 'loop', range: 6 };

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

  it('the loop of a conflict is counted without a reflection, once the search has met itself', () => {
    expect(flowProblemsOf({ ...betrayal, flow: [{ step: 'play' }, loopCount] })).toEqual([]);
  });

  it('a loop is counted only where the reference search leaves a conflict', () => {
    expect(flowProblemsOf({ ...betrayal, flow: [loopCount, { step: 'play' }] })).toEqual([
      { code: 'noConflict', step: 0 },
    ]);
    const unmet = { ...betrayal, solution: betrayal.solution.slice(0, 2) };
    expect(flowProblemsOf({ ...unmet, flow: [{ step: 'play' }, loopCount] })).toEqual([
      { code: 'noConflict', step: 1 },
    ]);
  });

  it('the vine of the conflict is pointed at only where the reference search leaves one', () => {
    const pick = { step: 'pickVine', prompt: 'ch4.2.sauce.02' };
    expect(flowProblemsOf({ ...betrayal, flow: [{ step: 'play' }, pick, loopCount] })).toEqual([]);
    expect(flowProblemsOf({ ...betrayal, flow: [pick, { step: 'play' }] })).toEqual([
      { code: 'noConflict', step: 0 },
    ]);
  });

  it('after the light searches by itself, its conflict can be pointed at and its loop counted', () => {
    const pick = { step: 'pickVine', prompt: 'ch4.2.sauce.02' };
    const lit = {
      ...betrayal,
      victory: undefined,
      solution: [{ type: 'pickVine', u: 'd', v: 'b' }],
    };
    expect(flowProblemsOf({ ...lit, flow: [{ step: 'autoSearch' }, pick, loopCount] })).toEqual([]);
  });

  it('the light searches with the moves the level allows, from the garden it has', () => {
    // Without marks unlocked (chapter 0), the light's first sun is refused.
    const early = { ...betrayal, id: '0.5', victory: undefined, solution: [{ type: 'tapGarden' }] };
    expect(flowProblemsOf({ ...early, flow: [{ step: 'autoSearch' }] })).toEqual([
      {
        code: 'lightRefused',
        step: 0,
        move: 0,
        reason: { code: 'actionLocked', action: 'markRoot' },
      },
    ]);
  });

  it('the flower challenge needs a flower, a chain to draw, and comes before any play', () => {
    const challenge = { step: 'flowerChallenge', attempts: 3 };
    expect(flowProblemsOf({ ...BLOOM, flow: [challenge] })).toEqual([]);
    expect(flowProblemsOf({ ...BLOOM, flower: undefined, flow: [challenge] })).toEqual([
      { code: 'flowerMissing', step: 0 },
    ]);
    // With e and t lit together, the open garden holds the most: no chain to draw.
    const full = { ...BLOOM, lanterns: [...BLOOM.lanterns, ['e', 't']] };
    expect(flowProblemsOf({ ...full, flow: [challenge] })).toEqual([
      { code: 'noChainToDraw', step: 0 },
    ]);
    const played = {
      ...BLOOM,
      victory: { type: 'maximum' },
      flow: [{ step: 'play' }, challenge],
      solution: [{ type: 'join', u: 'e', v: 't' }],
    };
    expect(flowProblemsOf(played)).toEqual([{ code: 'flowerAfterPlay', step: 1 }]);
  });
});
