import { maximumSize } from '@core/edmonds/fast/maximum';
import { size } from '@core/matching/queries';
import { checkRecipe } from '@core/recipe/check';
import { EMPTY_RECIPE, placeCard, type Recipe, type RecipeCardId } from '@core/recipe/recipe';
import { AUTOMATON_MOVES, runRecipe } from '@core/recipe/run';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog, compareLevelIds } from '@levels/catalog';
import { TAUGHT_IN } from '@levels/recipeCards';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the recipe book (GDD §7, chapter 6) that its levels must really hold, checked with
 * the core: the recipe the player writes is the search they ran by hand, the mechanical gardener
 * that follows it lights the most lanterns, a recipe without the fold card falls short in the
 * garden of 5.1, and the two notebook questions of 6.6 say why the recipe always ends.
 */

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** Plays moves from a garden; every one must be accepted. */
const play = (from: GardenState, moves: readonly Action[]): GardenState =>
  moves.reduce((state, move) => {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(outcome.reason)}`);
    return outcome.state;
  }, from);

/** The kinds of steps of a level's script, in order. */
const stepsOf = (level: Level): string[] => level.flow.map((step) => step.step);

/** The recipes the walkthrough of a level checks, in order, each with exactly its cards placed. */
const recipesOf = (level: Level): Recipe[] =>
  level.walkthrough.flatMap((entry) =>
    entry.type === 'recipe'
      ? [
          entry.cards.reduce(
            (recipe: Recipe, card: RecipeCardId) => placeCard(recipe, card),
            EMPTY_RECIPE,
          ),
        ]
      : [],
  );

describe('6.1: cards', () => {
  const level = levelOf('6.1');

  it('is written, and its script is a recipe built from nothing between two lines of the mentor', () => {
    expect(level.data.draft).toBe(false);
    expect(stepsOf(level)).toEqual(['say', 'recipe', 'say']);
    expect(level.flow[1]).toEqual({ step: 'recipe', missing: [] });
    expect(level.data.victory).toBeUndefined();
  });

  it('the walkthrough first falls for a distractor, taught in a level played before, then is right', () => {
    const recipes = recipesOf(level);
    const [tempted, ...rest] = recipes.map(checkRecipe);
    expect(tempted).toMatchObject({ right: false, failure: { kind: 'distractor' } });
    if (tempted?.right !== false) throw new Error('the first recipe is not tempted');
    expect(compareLevelIds(TAUGHT_IN[tempted.failure.case], level.data.id)).toBeLessThan(0);
    expect(rest.at(-1)).toEqual({ right: true });
  });

  it('the right recipe, run by the core in its garden, lights the most lanterns', () => {
    const start = { ...level.start, allowed: new Set(AUTOMATON_MOVES) };
    const ran = play(start, runRecipe(start, { fold: true }));
    expect(size(ran.matching)).toBe(maximumSize(level.graph));
  });
});
