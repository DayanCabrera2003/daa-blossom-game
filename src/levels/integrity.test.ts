import { describe, expect, it } from 'vitest';
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
  script: ['ch1.1.sauce.00'],
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

  it('the solution must actually win', () => {
    const short = { ...trap, solution: [{ type: 'join', u: 'B', v: 'C' }] };
    expect(problemsOf(short)).toContainEqual({ code: 'solutionFallsShort' });
  });

  it('the solution must earn the water star when the level has a budget', () => {
    const thirsty = {
      ...trap,
      id: '3.1',
      fog: true,
      water: 1,
      script: [],
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

  it('what a level unlocks must match the unlock table of the rules', () => {
    const wrong = { ...trap, unlocks: { actions: ['chain'] } };
    expect(problemsOf(wrong)).toContainEqual({
      code: 'unlockMismatch',
      action: 'chain',
      unlockedAt: '1.3',
    });
  });
});
