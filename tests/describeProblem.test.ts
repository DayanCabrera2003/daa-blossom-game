import { describe, expect, it } from 'vitest';
import { describeLoadError, describeProblem } from '../tools/describeProblem';

describe('readable level problems', () => {
  it('explains integrity problems in one line each', () => {
    expect(describeProblem({ code: 'goalMismatch', declared: 3, optimum: 2 })).toBe(
      'goal says 3 lanterns, but Edmonds finds 2',
    );
    expect(
      describeProblem({
        code: 'solutionRefused',
        step: 1,
        reason: { code: 'notAdjacent', u: 0, v: 2 },
      }),
    ).toBe('solution step 2 is refused by the rules: notAdjacent {"u":0,"v":2}');
    expect(describeProblem({ code: 'solutionFallsShort' })).toBe(
      'the solution is accepted but does not win the level',
    );
  });

  it('every kind of problem has a message', () => {
    const problems = [
      { code: 'wonAtStart' },
      { code: 'victoryOutOfReach', value: 4, optimum: 3 },
      { code: 'solutionLocked', step: 0, action: 'chain' },
      { code: 'solutionOverWater', used: 5, budget: 4 },
      { code: 'foreignLine', line: 'ch2.1.sauce.00' },
      { code: 'unlockMismatch', action: 'chain', unlockedAt: '1.3' },
      { code: 'playWithoutVictory' },
      { code: 'victoryWithoutPlay' },
    ] as const;
    for (const problem of problems) expect(describeProblem(problem)).not.toBe('');
  });

  it('explains why a file did not load', () => {
    expect(describeLoadError({ code: 'schema', issues: ['id: bad', 'goal: missing'] })).toBe(
      'schema: id: bad; goal: missing',
    );
    expect(describeLoadError({ code: 'badLabel', error: { code: 'unknownName', name: 'z' } })).toBe(
      'badLabel: {"code":"unknownName","name":"z"}',
    );
  });
});
