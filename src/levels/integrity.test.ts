import { describe, expect, it } from 'vitest';
import { BLOOM } from '../../tests/support/fixtureLevels';
import { checkIntegrity } from './integrity';
import { loadLevel } from './loader';

/** Level 1.1, "La trampa": a–b–c–d, two lanterns possible, solved with two joins. */
const trap = {
  id: '1.1',
  sprouts: ['A', 'B', 'C', 'D'].map((label, i) => ({ label, x: 120 + 80 * i, y: 135 })),
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
  ],
  goal: { visible: true, value: 2 },
  victory: { type: 'matchingSize', value: 2 },
  flow: [{ step: 'say', lines: ['ch1.1.sauce.00'] }, { step: 'play' }],
  unlocks: { actions: ['passLantern'] },
  solution: [
    { type: 'join', u: 'A', v: 'B' },
    { type: 'join', u: 'C', v: 'D' },
  ],
};

/** Checks a level file that must load. */
const problemsOf = (json: unknown) => {
  const level = loadLevel(json);
  if (!level.ok) throw new Error(`level does not load: ${JSON.stringify(level.error)}`);
  return checkIntegrity(level.value);
};

describe('level integrity', () => {
  it('a sound level has no problems', () => {
    expect(problemsOf(trap)).toEqual([]);
  });

  it('a level must not be won before the player does anything', () => {
    const alreadyLit = {
      ...trap,
      lanterns: [
        ['A', 'B'],
        ['C', 'D'],
      ],
      solution: [{ type: 'split', u: 'A', v: 'B' }],
    };
    expect(problemsOf(alreadyLit)).toContainEqual({ code: 'wonAtStart' });
  });

  it('the declared goal must be the true optimum, computed by Edmonds', () => {
    expect(problemsOf({ ...trap, goal: { visible: true, value: 3 } })).toContainEqual({
      code: 'goalMismatch',
      declared: 3,
      optimum: 2,
    });
  });

  it('a victory asking for more lanterns than fit can never be won', () => {
    expect(problemsOf({ ...trap, victory: { type: 'matchingSize', value: 3 } })).toContainEqual({
      code: 'victoryOutOfReach',
      value: 3,
      optimum: 2,
    });
  });

  it('the solution may only use actions the level allows', () => {
    const locked = { ...trap, solution: [{ type: 'chain', path: ['A', 'B'] }] };
    expect(problemsOf(locked)).toContainEqual({ code: 'solutionLocked', step: 0, action: 'chain' });
  });

  it('every step of the solution must be accepted by the rules', () => {
    const refused = { ...trap, solution: [{ type: 'join', u: 'A', v: 'C' }] };
    expect(problemsOf(refused)).toContainEqual({
      code: 'solutionRefused',
      step: 0,
      reason: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });

  it('script inputs in the solution leave the garden alone, and count as steps', () => {
    const answered = {
      ...trap,
      solution: [{ type: 'answer', option: 0 }, ...trap.solution, { type: 'tapGarden' }],
    };
    expect(problemsOf(answered)).toEqual([]);
    const refused = {
      ...trap,
      solution: [
        { type: 'bet', value: 2 },
        { type: 'join', u: 'A', v: 'C' },
      ],
    };
    expect(problemsOf(refused)).toContainEqual({
      code: 'solutionRefused',
      step: 1,
      reason: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });

  it('the solution must actually win', () => {
    const short = { ...trap, solution: [{ type: 'join', u: 'B', v: 'C' }] };
    expect(problemsOf(short)).toContainEqual({ code: 'solutionFallsShort' });
  });

  it('a search from R alone that ends without a chain completes the play of 4.2', () => {
    const lying = {
      id: '4.2',
      sprouts: ['R', 'a', 'b', 'c', 'd', 'e'].map((label, i) => ({
        label,
        x: 40 + 70 * i,
        y: 135,
      })),
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
    expect(problemsOf(lying)).toEqual([]);
    // A search that is over needs "Terminé" to be claimed.
    expect(problemsOf({ ...lying, victory: { type: 'searchExhausted' } })).toEqual([
      { code: 'solutionFallsShort' },
    ]);
    expect(
      problemsOf({
        ...lying,
        victory: { type: 'searchExhausted' },
        solution: [...lying.solution, { type: 'declareDone' }],
      }),
    ).toEqual([]);
    // With nobody allowed to start in the dark, there is no search to play.
    expect(problemsOf({ ...lying, roots: ['a'] })).toContainEqual({ code: 'wonAtStart' });
  });

  it('the solution must earn the water star when the level has a budget', () => {
    const thirsty = {
      ...trap,
      id: '3.1',
      fog: true,
      water: 1,
      flow: [{ step: 'play' }],
      unlocks: { actions: [] },
      solution: [
        { type: 'inspect', vertex: 'A' },
        { type: 'inspect', vertex: 'C' },
        { type: 'join', u: 'A', v: 'B' },
        { type: 'join', u: 'C', v: 'D' },
      ],
    };
    expect(problemsOf(thirsty)).toContainEqual({ code: 'solutionOverWater', used: 2, budget: 1 });
  });

  it('dialogue lines belong to their own level', () => {
    const foreign = { ...trap, hints: [{ line: 'ch2.4.sauce.01', highlight: [] }] };
    expect(problemsOf(foreign)).toContainEqual({ code: 'foreignLine', line: 'ch2.4.sauce.01' });
  });

  it('notebook lines belong to their own level too', () => {
    const notebook = {
      prompt: 'ch1.1.notebook.00',
      options: [
        { line: 'ch1.1.notebook.01', correct: true },
        { line: 'ch2.2.notebook.02', correct: false },
      ],
    };
    expect(problemsOf({ ...trap, notebook })).toEqual([
      { code: 'foreignLine', line: 'ch2.2.notebook.02' },
    ]);
  });

  it('a counterexample is checked as a garden, and its lines belong to the level', () => {
    const notebook = {
      prompt: 'ch1.1.notebook.00',
      options: [
        { line: 'ch1.1.notebook.01', correct: true },
        {
          line: 'ch1.1.notebook.02',
          correct: false,
          counterexample: {
            mode: 'play',
            line: 'ch2.2.sauce.07',
            sprouts: [{ label: 'a', x: 100, y: 100 }],
            vines: [['a', 'a']],
            actions: ['join'],
          },
        },
      ],
    };
    expect(problemsOf({ ...trap, notebook })).toEqual([
      {
        code: 'badCounterexample',
        option: 1,
        error: { code: 'badGraph', error: expect.anything() },
      },
      { code: 'foreignLine', line: 'ch2.2.sauce.07' },
    ]);
  });

  it('a play step needs a victory to end, and a victory needs a play step to be reached', () => {
    expect(problemsOf({ ...trap, victory: undefined })).toEqual([{ code: 'playWithoutVictory' }]);
    const noPlay = { ...trap, flow: [{ step: 'say', lines: ['ch1.1.sauce.00'] }] };
    expect(problemsOf(noPlay)).toEqual([{ code: 'victoryWithoutPlay' }]);
  });

  it('a level that is only talk has no victory to check', () => {
    const talk = {
      ...trap,
      victory: undefined,
      lanterns: [['A', 'B']],
      flow: [{ step: 'say', lines: ['ch1.1.sauce.00'] }],
      solution: [{ type: 'tapGarden' }],
    };
    expect(problemsOf(talk)).toEqual([]);
  });

  it('the checks of the script are part of the integrity of the level', () => {
    const notebookless = { ...trap, flow: [{ step: 'play' }, { step: 'notebook' }] };
    expect(problemsOf(notebookless)).toEqual([{ code: 'notebookMissing', step: 1 }]);
  });

  it('the checks of the flower a level declares are part of its integrity', () => {
    expect(problemsOf(BLOOM)).toEqual([]);
    expect(problemsOf({ ...BLOOM, flower: ['c', 'd', 'f', 'g', 'b'] })).toEqual([
      { code: 'flowerBaseNotFirst', base: 'b' },
    ]);
  });

  it('what a level unlocks must match the unlock table of the rules', () => {
    const wrong = { ...trap, unlocks: { actions: ['chain'] } };
    expect(problemsOf(wrong)).toContainEqual({
      code: 'unlockMismatch',
      action: 'chain',
      unlockedAt: '1.3',
    });
  });

  it('in a garden of bees and flowers, every vine joins a bee and a flower', () => {
    const kinded = (kinds: string[]) => ({
      ...trap,
      sprouts: trap.sprouts.map((sprout, i) => ({ ...sprout, kind: kinds[i] })),
    });
    expect(problemsOf(kinded(['bee', 'flower', 'bee', 'flower']))).toEqual([]);
    expect(problemsOf(kinded(['bee', 'flower', 'flower', 'bee']))).toEqual([
      { code: 'sameKindVine', u: 'B', v: 'C', kind: 'flower' },
    ]);
    expect(problemsOf(kinded(['bee', 'bee', 'flower', 'flower']))).toEqual([
      { code: 'sameKindVine', u: 'A', v: 'B', kind: 'bee' },
      { code: 'sameKindVine', u: 'C', v: 'D', kind: 'flower' },
    ]);
  });
});
