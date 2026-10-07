import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import {
  closedFlowerLevel,
  festivalLevel,
  fivePetalsLevel,
  helixLevel,
  twoComponentsLevel,
} from '../../../tests/support/fixtureLevels';
import { fastEdmonds } from '@core/edmonds/fast/solve';
import { cycleGraph, pathGraph } from '@core/generators/families';
import { createMatching } from '@core/matching/createMatching';
import { size } from '@core/matching/queries';
import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { actionsUnlockedBy, UNLOCKED_AT } from '@core/rules/permissions';
import { createGardenState, type GardenState } from '@core/rules/state';
import { isVictory, type VictoryCondition } from '@core/rules/victory';
import { unwrap } from '@core/shared/result';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { nextMove, type MentorGoal } from './nextMove';

const EVERY = Object.keys(UNLOCKED_AT) as ActionType[];

/** Lets the mentor play until the level is won; every step must be accepted. Returns the steps. */
const mentorPlays = (goal: MentorGoal, from: GardenState, limit = 200): number => {
  let state = from;
  for (let steps = 0; steps < limit; steps++) {
    if (isVictory(state, goal.victory)) return steps;
    const move = nextMove(goal, state);
    if (move === null) throw new Error(`the mentor has no move, and the level is not won`);
    const outcome = applyAction(state, move);
    if (!outcome.ok)
      throw new Error(`the mentor's ${move.type} is refused: ${outcome.reason.code}`);
    state = outcome.state;
  }
  throw new Error('the mentor did not finish');
};

/** The mentor's goal in a level; only levels with a victory have one. */
const goalOf = (level: Level): MentorGoal => {
  const { victory } = level.data;
  if (victory === undefined) throw new Error(`level ${level.data.id} has no victory`);
  return { start: level.start, solution: level.solution, victory };
};
/** The levels the mentor can win: those whose script has a victory to reach. */
const winnable = () => catalog().filter((level) => level.data.victory !== undefined);
const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};
const after = (level: Level, actions: Action[]): GardenState =>
  actions.reduce((state, action) => {
    const outcome = applyAction(state, action);
    if (!outcome.ok) throw new Error(`setup move refused: ${outcome.reason.code}`);
    return outcome.state;
  }, level.start);

describe("the mentor's next step (hint grade 3)", () => {
  it.each(winnable().map((level) => [level.data.id, level] as const))(
    'wins level %s from the start, with moves the rules accept',
    (_, level) => {
      expect(mentorPlays(goalOf(level), level.start)).toBeGreaterThan(0);
    },
  );

  it.each([
    ['1.1', 'the trap B=C', () => levelById('1.1'), [{ type: 'join', u: 1, v: 2 }]],
    ['4.6', 'a sun off the solution', fivePetalsLevel, [{ type: 'markRoot', vertex: 7 }]],
    ['4.9', 'a lantern put out', closedFlowerLevel, [{ type: 'split', u: 1, v: 2 }]],
    ['7.3', 'a wrong stone', helixLevel, [{ type: 'liftStone', vertex: 2 }]],
    ['7.4', 'a lantern put out', twoComponentsLevel, [{ type: 'split', u: 1, v: 2 }]],
  ] as [string, string, () => Level, Action[]][])(
    'wins level %s after %s',
    (_, __, build, mistake) => {
      const level = build();
      mentorPlays(goalOf(level), after(level, mistake));
    },
  );

  it("on the reference solution, it gives the solution's own next step", () => {
    const level = fivePetalsLevel();
    const [first, second] = level.solution;
    expect(nextMove(goalOf(level), level.start)).toEqual(first);
    expect(nextMove(goalOf(level), after(level, [first as Action]))).toEqual(second);
  });

  it('once the level is won, it has nothing to add', () => {
    const level = levelById('0.1');
    expect(nextMove(goalOf(level), after(level, level.solution as Action[]))).toBeNull();
  });

  it('for a level won by finding a chain, it searches with marks (3.1)', () => {
    // R–a=b–c=d–T as 0–1=2–3=4–5, in the fog.
    const path = pathGraph(6);
    const start = createGardenState({
      graph: path,
      matching: unwrap(
        createMatching(path, [
          [1, 2],
          [3, 4],
        ]),
      ),
      fog: true,
      allowed: ['inspect', 'markRoot', 'markMoon', 'foldAt'],
    });
    const goal: MentorGoal = { start, solution: [], victory: { type: 'chainFound' } };
    mentorPlays(goal, start);
  });

  it('property: in any garden it reaches the most lanterns, with every action at hand', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
        const start = createGardenState({ graph, matching, allowed: EVERY });
        const victory: VictoryCondition = { type: 'matchingSize', value: size(fastEdmonds(graph)) };
        mentorPlays({ start, solution: [], victory }, start);
      }),
    );
  });

  it('property: before chains exist, joining and passing lanterns also gets there (chapter 1)', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 8 }), ([graph, matching]) => {
        const start = createGardenState({
          graph,
          matching,
          allowed: ['join', 'split', 'passLantern'],
        });
        const victory: VictoryCondition = { type: 'matchingSize', value: size(fastEdmonds(graph)) };
        mentorPlays({ start, solution: [], victory }, start, 10 * graph.n + 10);
      }),
    );
  });

  it('scarecrows: takes away the wrong one, places the right ones, then says "Terminé" (3.7)', () => {
    // 1–2–3–4–5 as 0..4, two lanterns lit, a scarecrow on the wrong sprout.
    const path = pathGraph(5);
    const start = createGardenState({
      graph: path,
      matching: unwrap(
        createMatching(path, [
          [0, 1],
          [2, 3],
        ]),
      ),
      allowed: ['placeScarecrow', 'removeScarecrow', 'declareDone'],
    });
    const goal: MentorGoal = { start, solution: [], victory: { type: 'coverCertificate' } };
    const misplaced = { ...start, scarecrows: [0] };
    expect(nextMove(goal, misplaced)).toEqual({ type: 'removeScarecrow', vertex: 0 });
    mentorPlays(goal, misplaced);
    expect(nextMove(goal, { ...start, scarecrows: [1, 3] })).toEqual({ type: 'declareDone' });
  });

  it('stones: lifts the moons of the failed search when no solution guides it (7.3)', () => {
    const level = helixLevel();
    const goal: MentorGoal = { ...goalOf(level), solution: [] };
    expect(nextMove(goal, level.start)).toEqual({ type: 'liftStone', vertex: 0 });
    mentorPlays(goal, level.start);
  });

  it('when nothing it may do leads anywhere, it says nothing rather than something wrong', () => {
    // A garden with no chain to find: the search runs out of looks.
    const path = pathGraph(2);
    const start = createGardenState({
      graph: path,
      matching: unwrap(createMatching(path, [[0, 1]])),
      allowed: ['markRoot', 'markMoon', 'foldAt'],
    });
    expect(nextMove({ start, solution: [], victory: { type: 'chainFound' } }, start)).toBeNull();
    // Scarecrows cannot prove anything in a garden with an odd loop: no target to aim at.
    const triangle = createGardenState({ graph: cycleGraph(3), allowed: ['placeScarecrow'] });
    const lit = { ...triangle, matching: unwrap(createMatching(cycleGraph(3), [[0, 1]])) };
    expect(
      nextMove({ start: lit, solution: [], victory: { type: 'coverCertificate' } }, lit),
    ).toBeNull();
  });

  it('with a flower folded off the solution, it opens it before moving lanterns (4.6)', () => {
    const level = fivePetalsLevel();
    const folded = after(level, [...level.solution.slice(0, 5), { type: 'markRoot', vertex: 7 }]);
    expect(folded.layer.nodes.length).toBeLessThan(folded.graph.n);
    expect(nextMove(goalOf(level), folded)).toEqual({ type: 'unfold', blossom: 0 });
    mentorPlays(goalOf(level), folded);
  });

  it('searching for a chain, it folds where two suns of one tree meet (4.1 to 4.4)', () => {
    const level = festivalLevel();
    const start: GardenState = { ...level.start, allowed: new Set(actionsUnlockedBy('4.4')) };
    const goal: MentorGoal = { start, solution: [], victory: { type: 'chainFound' } };
    let state = start;
    const moves: Action[] = [];
    while (!isVictory(state, goal.victory)) {
      const move = nextMove(goal, state);
      if (move === null) throw new Error('stuck');
      moves.push(move);
      const outcome = applyAction(state, move);
      if (!outcome.ok) throw new Error(outcome.reason.code);
      state = outcome.state;
    }
    expect(moves.some((move) => move.type === 'foldAt')).toBe(true);
  });

  it('where folding is still locked (4.1), it never suggests folding, and runs out of steps', () => {
    const level = festivalLevel();
    const goal: MentorGoal = { start: level.start, solution: [], victory: { type: 'chainFound' } };
    let state = level.start;
    for (let move = nextMove(goal, state); move !== null; move = nextMove(goal, state)) {
      expect(move.type).not.toBe('foldAt');
      const outcome = applyAction(state, move);
      if (!outcome.ok) throw new Error(`refused ${move.type}: ${outcome.reason.code}`);
      state = outcome.state;
    }
    expect(isVictory(state, goal.victory)).toBe(false);
  });
});
