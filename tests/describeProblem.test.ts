import { describe, expect, it } from 'vitest';
import {
  describeCodexProblem,
  describeLoadError,
  describeProblem,
  describeWalkthroughProblem,
} from '../tools/describeProblem';

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
    expect(
      describeProblem({
        code: 'demoRefused',
        step: 2,
        move: 0,
        reason: { code: 'notAdjacent', u: 0, v: 2 },
      }),
    ).toBe('script step 3: demo move 1 is refused by the rules: notAdjacent {"u":0,"v":2}');
    expect(
      describeProblem({
        code: 'lightRefused',
        step: 0,
        move: 0,
        reason: { code: 'actionLocked', action: 'markRoot' },
      }),
    ).toBe(
      'script step 1: move 1 of the light\'s own search is refused by the rules: actionLocked {"action":"markRoot"}',
    );
    expect(
      describeProblem({
        code: 'automatonRefused',
        step: 1,
        move: 1,
        reason: { code: 'notARoot', vertex: 7 },
      }),
    ).toBe(
      'script step 2: move 2 of the automaton\'s run is refused by the rules: notARoot {"vertex":7}',
    );
    expect(describeProblem({ code: 'recipeCannotRun', step: 0 })).toBe(
      'script step 1 runs a recipe the automaton cannot run: only the fold card may be missing',
    );
    expect(describeProblem({ code: 'betOutOfRange', step: 0, range: 3, optimum: 4 })).toBe(
      'script step 1 bets from 1 to 3 lanterns, but the garden holds 4: nobody can win it',
    );
    expect(describeProblem({ code: 'raceBetWithoutRaces', step: 2 })).toBe(
      'script step 3 is a doubling bet, but it needs a race before it and one after it',
    );
    expect(describeProblem({ code: 'raceNotDoubled', step: 2, before: 8, after: 10 })).toBe(
      'script step 3 bets on a doubling, but the races go from 8 to 10 sprouts of the same family',
    );
    expect(describeProblem({ code: 'raceBetUnclear', step: 2, answer: 'double' })).toBe(
      'script step 3 bets on a doubling whose steps sit near an edge of "double": pick other seeds',
    );
    expect(
      describeProblem({
        code: 'badCounterexample',
        question: 1,
        option: 1,
        error: { code: 'badLabel', error: { code: 'unknownName', name: 'z' } },
      }),
    ).toBe(
      'notebook question 2, statement 2: its counterexample is no garden: badLabel {"error":{"code":"unknownName","name":"z"}}',
    );
    expect(describeProblem({ code: 'sameKindVine', u: 'b', v: 'c', kind: 'flower' })).toBe(
      'vine b–c joins two flowers, but a bee only pairs with a flower',
    );
    expect(describeProblem({ code: 'notAFlower', error: { code: 'evenLength', length: 4 } })).toBe(
      'the declared flower is no flower of the starting lanterns: evenLength {"length":4}',
    );
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
      { code: 'noCorrectOption', step: 2 },
      { code: 'notebookMissing', step: 3 },
      { code: 'mirrorMissing', step: 0 },
      { code: 'pieceOutsideTangle', step: 4, sprout: 'G' },
      { code: 'drawUnbeatable', step: 5 },
      { code: 'noConflict', step: 1 },
      { code: 'counterexampleLocked', question: 0, option: 1, action: 'fold' },
      { code: 'counterexampleUnbeatable', question: 0, option: 2 },
      { code: 'sameKindVine', u: 'a', v: 'b', kind: 'bee' },
      {
        code: 'counterexampleSameKindVine',
        question: 0,
        option: 1,
        u: 'a',
        v: 'b',
        kind: 'flower',
      },
      { code: 'notAFlower', error: { code: 'evenLength', length: 4 } },
      { code: 'flowerBaseLit', base: 'b' },
      { code: 'flowerBaseNotFirst', base: 'b' },
      { code: 'flowerOffSide', sprout: 't' },
      { code: 'flowerMissing', step: 1 },
      { code: 'noChainToDraw', step: 1 },
      { code: 'flowerAfterPlay', step: 1 },
      { code: 'recallAhead', step: 0, level: '4.4' },
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

  it('explains why a walkthrough does not play through', () => {
    expect(
      describeWalkthroughProblem({ code: 'moveRefused', entry: 2, reason: { code: 'notNow' } }),
    ).toBe('walkthrough entry 3 is refused while playing: notNow');
    expect(
      describeWalkthroughProblem({ code: 'gestureImpossible', entry: 0, message: 'hidden vine' }),
    ).toBe('walkthrough entry 1 cannot be made with gestures: hidden vine');
    expect(describeWalkthroughProblem({ code: 'gestureMismatch', entry: 4 })).toBe(
      'walkthrough entry 5: the gestures make a different move',
    );
    expect(describeWalkthroughProblem({ code: 'inputIgnored', entry: 1 })).toBe(
      'walkthrough entry 2 is an input the script is not waiting for',
    );
    expect(describeWalkthroughProblem({ code: 'unfinished', step: 3 })).toBe(
      'the walkthrough ends with the script still waiting at step 4',
    );
  });
  it('explains how the catalog opens the Codex wrongly', () => {
    expect(describeCodexProblem({ code: 'codexNeverWhole', entry: 'C13' })).toBe(
      'Codex entry C13 never opens whole in a playable level',
    );
    expect(describeCodexProblem({ code: 'codexPartAfterWhole', entry: 'C1', level: '2.1' })).toBe(
      'level 2.1 opens only some tabs of Codex entry C1, already whole before',
    );
    expect(
      describeCodexProblem({
        code: 'notebookLinkBehind',
        level: '2.4',
        question: 0,
        entry: 'C2',
        opensAt: '1.8',
      }),
    ).toBe('level 2.4: notebook question 1 links to C2, already open since 1.8');
  });
});
