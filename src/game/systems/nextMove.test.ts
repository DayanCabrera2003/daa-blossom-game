import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { fastEdmonds } from '@core/edmonds/fast/solve';
import { pathGraph } from '@core/generators/families';
import { createMatching } from '@core/matching/createMatching';
import { size } from '@core/matching/queries';
import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { UNLOCKED_AT } from '@core/rules/permissions';
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

const goalOf = (level: Level): MentorGoal => ({
  start: level.start,
  solution: level.solution,
  victory: level.data.victory,
});
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
  it.each(catalog().map((level) => [level.data.id, level] as const))(
    'wins level %s from the start, with moves the rules accept',
    (_, level) => {
      expect(mentorPlays(goalOf(level), level.start)).toBeGreaterThan(0);
    },
  );

  it.each([
    ['1.1', 'the trap B=C', [{ type: 'join', u: 1, v: 2 }]],
    ['4.6', 'a sun off the solution', [{ type: 'markRoot', vertex: 7 }]],
    ['4.9', 'a lantern put out', [{ type: 'split', u: 1, v: 2 }]],
    ['7.3', 'a wrong stone', [{ type: 'liftStone', vertex: 2 }]],
    ['7.4', 'a lantern put out', [{ type: 'split', u: 1, v: 2 }]],
  ] as [string, string, Action[]][])('wins level %s after %s', (id, _, mistake) => {
    const level = levelById(id);
    mentorPlays(goalOf(level), after(level, mistake));
  });

  it("on the reference solution, it gives the solution's own next step", () => {
    const level = levelById('4.6');
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
});
