import { RIGHT_RECIPE, withoutCases } from '@core/recipe/recipe';
import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS } from './hints';
import {
  askHint,
  checkRecipeNow,
  isHintAvailable,
  openSession,
  recipeBoardOf,
  stepNow,
  touchRecipe,
  type LevelSession,
} from './levelSession';

/** A pair of sprouts whose script is `flow`: nothing in it is about the garden. */
const recipeLevel = (flow: unknown[]): Level => {
  const loaded = loadLevel({
    id: '6.1',
    sprouts: [
      { label: 'a', x: 100, y: 100 },
      { label: 'b', x: 200, y: 100 },
    ],
    vines: [['a', 'b']],
    goal: { visible: false },
    flow,
    solution: [{ type: 'tapGarden' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

/** Touches every card of the right recipe, in order. */
const touchAll = (session: LevelSession): LevelSession =>
  [
    RIGHT_RECIPE.mark ?? 'markDarkSuns',
    ...RIGHT_RECIPE.cases,
    RIGHT_RECIPE.end ?? 'finishKeepMoons',
  ].reduce(touchRecipe, session);

describe('a level session with the recipe (6.1, 6.3)', () => {
  it('opens on an empty recipe, and the step ends when a check finds it right', () => {
    const { session, effects } = openSession(recipeLevel([{ step: 'recipe' }]), 0);
    expect(effects).toEqual([{ kind: 'recipe', step: 0, missing: [] }]);
    expect(recipeBoardOf(session)?.recipe).toEqual({ mark: null, cases: [], end: null });

    const wrong = checkRecipeNow(session, 0);
    expect(wrong.verdict).toMatchObject({ right: false, failure: { case: 'start' } });
    expect(wrong.effects).toEqual([]);
    expect(stepNow(wrong.session)?.step).toBe('recipe');

    const built = touchAll(wrong.session);
    const right = checkRecipeNow(built, 0);
    expect(right.verdict).toEqual({ right: true });
    expect(right.effects).toEqual([{ kind: 'finished' }]);
    expect(right.session.won).not.toBeNull();
  });

  it('brings the right recipe without the cards of the missing cases, to be repaired', () => {
    const level = recipeLevel([{ step: 'recipe', missing: ['sameTree'] }]);
    const { session } = openSession(level, 0);
    expect(recipeBoardOf(session)?.recipe).toEqual(withoutCases(RIGHT_RECIPE, ['sameTree']));
    const repaired = touchRecipe(session, 'foldFlower');
    expect(checkRecipeNow(repaired, 0).effects).toEqual([{ kind: 'finished' }]);
  });

  it('three wrong checks in a row offer a hint, whose grade 3 places a right card', () => {
    const level = recipeLevel([{ step: 'recipe', missing: ['moon', 'end'] }]);
    let session = openSession(level, 0).session;
    for (let check = 0; check < 3; check++) session = checkRecipeNow(session, 0).session;
    expect(isHintAvailable(session, 0)).toBe(true);
    for (let grade = 1; grade < 3; grade++) {
      const opened = askHint(session, grade * HINT_DELAY_MS);
      expect(opened?.hint.card).toBeNull();
      session = opened?.session ?? session;
    }
    const third = askHint(session, 3 * HINT_DELAY_MS);
    expect(third?.hint.card).toBe('moonNothing');
    expect(recipeBoardOf(third?.session ?? session)?.recipe.cases).toContain('moonNothing');
  });

  it('outside the recipe step there is no table: touches and checks change nothing', () => {
    const level = recipeLevel([{ step: 'sun' }, { step: 'recipe' }]);
    const { session } = openSession(level, 0);
    expect(recipeBoardOf(session)).toBeNull();
    expect(touchRecipe(session, 'foldFlower')).toBe(session);
    expect(checkRecipeNow(session, 0)).toEqual({ session, verdict: null, effects: [] });
  });

  it('a hint on a right recipe places nothing more', () => {
    const built = touchAll(openSession(recipeLevel([{ step: 'recipe' }]), 0).session);
    let session = built;
    for (let grade = 1; grade <= 3; grade++) {
      session = askHint(session, grade * HINT_DELAY_MS)?.session ?? session;
    }
    expect(session.hints.opened).toBe(3);
    expect(recipeBoardOf(session)?.recipe).toEqual(recipeBoardOf(built)?.recipe);
  });
});
