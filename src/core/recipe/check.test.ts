import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkRecipe } from './check';
import {
  EMPTY_RECIPE,
  placeCard,
  RECIPE_CARDS,
  RECIPE_CASES,
  RIGHT_RECIPE,
  rightCardOf,
  takeCard,
  withoutCases,
  type Recipe,
} from './recipe';

describe('checkRecipe', () => {
  it('finds the recipe of the GDD right', () => {
    expect(checkRecipe(RIGHT_RECIPE)).toEqual({ right: true });
  });

  it('finds it right in any order of its cases', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...RIGHT_RECIPE.cases], {
          minLength: RIGHT_RECIPE.cases.length,
          maxLength: RIGHT_RECIPE.cases.length,
        }),
        (cases) => checkRecipe({ ...RIGHT_RECIPE, cases }).right,
      ),
    );
  });

  it.each(RECIPE_CARDS.filter((card) => !card.right))(
    'catches the distractor $id, with its case $case',
    (distractor) => {
      // In the place of the right card of its case, or beside it: either way it is caught.
      const instead = placeCard(
        takeCard(RIGHT_RECIPE, rightCardOf(distractor.case).id),
        distractor.id,
      );
      const beside = { ...RIGHT_RECIPE, cases: [...RIGHT_RECIPE.cases, distractor.id] };
      const failure = { kind: 'distractor', card: distractor.id, case: distractor.case };
      expect(checkRecipe(instead)).toEqual({ right: false, failure });
      if (distractor.case !== 'end') expect(checkRecipe(beside)).toEqual({ right: false, failure });
    },
  );

  it.each(RECIPE_CASES)('catches the absence of the case %s', (missing) => {
    const failure = { kind: 'missing', card: rightCardOf(missing).id, case: missing };
    expect(checkRecipe(withoutCases(RIGHT_RECIPE, [missing]))).toEqual({ right: false, failure });
  });

  it('finds "repeat until no sprout is left in the dark" wrong without running it', () => {
    // A recipe that could never finish is judged as written: the check returns at once.
    const forever: Recipe = { ...RIGHT_RECIPE, end: 'untilNoneDark' };
    expect(checkRecipe(forever)).toEqual({
      right: false,
      failure: { kind: 'distractor', card: 'untilNoneDark', case: 'end' },
    });
  });

  it('names the first failing card in the order of the cases', () => {
    // The start is missing, a moon is turned into a sun and the end may never come.
    const recipe: Recipe = {
      mark: null,
      cases: ['moonToSun', 'chainToDark'],
      end: 'untilNoneDark',
    };
    expect(checkRecipe(recipe)).toEqual({
      right: false,
      failure: { kind: 'missing', card: 'markDarkSuns', case: 'start' },
    });
    expect(checkRecipe({ ...recipe, mark: 'markDarkSuns' })).toEqual({
      right: false,
      failure: { kind: 'missing', card: 'growMoon', case: 'lit' },
    });
    expect(checkRecipe(EMPTY_RECIPE).right).toBe(false);
  });
});
