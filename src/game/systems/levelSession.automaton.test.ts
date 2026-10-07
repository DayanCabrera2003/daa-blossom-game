import { size } from '@core/matching/queries';
import { RIGHT_RECIPE, withoutCases } from '@core/recipe/recipe';
import { describe, expect, it } from 'vitest';
import { automatonLevel } from '../../../tests/support/fixtureLevels';
import { automatonDay } from './automaton';
import {
  act,
  automatonDayOf,
  checkRecipeNow,
  garden,
  openSession,
  respond,
  stepNow,
  touchRecipe,
  type LevelSession,
} from './levelSession';
import { NOT_NOW } from './refusal';

// The garden of 5.1 (R a b c d g h t = 0…7): write the recipe, watch Bruto's run without the fold
// card, put the card back, and watch the repaired recipe run.
const level = automatonLevel();

/** The session once the recipe on the table is the right one and checked. */
const written = (session: LevelSession): LevelSession => {
  let current = session;
  for (const card of RIGHT_RECIPE.cases) current = touchRecipe(current, card);
  for (const card of [RIGHT_RECIPE.mark, RIGHT_RECIPE.end]) {
    if (card !== null) current = touchRecipe(current, card);
  }
  return checkRecipeNow(current, 0).session;
};

/** The session where the second recipe step (the fold card missing) is repaired and checked. */
const repaired = (session: LevelSession): LevelSession =>
  checkRecipeNow(touchRecipe(session, 'foldFlower'), 0).session;

describe('a level session where the automaton runs a recipe (6.2, 6.3)', () => {
  it('waits for its run to be shown, taking no move meanwhile', () => {
    const session = written(openSession(level, 0).session);
    expect(stepNow(session)).toEqual({ step: 'automaton', missing: ['sameTree'] });
    const tried = act(session, { type: 'markRoot', vertex: 0 }, 0);
    expect(tried.outcome).toEqual({ ok: false, reason: NOT_NOW });
  });

  it("runs Bruto's recipe from the starting lanterns: its day stops at 3 and says done", () => {
    const session = written(openSession(level, 0).session);
    const broken = withoutCases(RIGHT_RECIPE, ['sameTree']);
    expect(automatonDayOf(session)).toEqual(automatonDay(level.start, broken));
    const shown = respond(session, { type: 'searched' }, 0);
    expect(shown.session.history.states).toEqual(automatonDay(level.start, broken));
    expect(size(garden(shown.session).matching)).toBe(3);
    expect(garden(shown.session).declaredDone).toBe(true);
    expect(shown.effects).toEqual([{ kind: 'recipe', step: 2, missing: ['sameTree'] }]);
  });

  it('runs the repaired recipe in a new day from the same starting lanterns, and reaches 4', () => {
    const first = respond(written(openSession(level, 0).session), { type: 'searched' }, 0);
    const session = repaired(first.session);
    expect(stepNow(session)).toEqual({ step: 'automaton' });
    const day = automatonDayOf(session);
    expect(day?.[0]).toBe(level.start);
    const shown = respond(session, { type: 'searched' }, 0);
    expect(shown.session.history.states).toEqual(day);
    expect(size(garden(shown.session).matching)).toBe(4);
    expect(shown.effects).toEqual([{ kind: 'finished' }]);
    expect(shown.session.won).not.toBeNull();
  });

  it('with no recipe written in the level, the right one runs', () => {
    const plain = { ...level, flow: [{ step: 'automaton' as const }] };
    const { session } = openSession(plain, 0);
    expect(automatonDayOf(session)).toEqual(automatonDay(level.start, RIGHT_RECIPE));
  });

  it('there is no run outside its step, and news of one changes nothing', () => {
    const { session } = openSession(level, 0);
    expect(automatonDayOf(session)).toBeNull();
    const again = respond(session, { type: 'searched' }, 0);
    expect(again.session.history).toBe(session.history);
    expect(again.effects).toEqual([]);
  });
});
