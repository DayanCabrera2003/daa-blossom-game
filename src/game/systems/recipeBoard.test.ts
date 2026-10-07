import { checkRecipe } from '@core/recipe/check';
import { EMPTY_RECIPE, RIGHT_RECIPE, withoutCases, type Recipe } from '@core/recipe/recipe';
import { describe, expect, it } from 'vitest';
import { checkBoard, mentorFix, startBoard, touchCard } from './recipeBoard';

describe('the recipe on the table (6.1)', () => {
  it('starts empty, or as the right recipe without the missing cases (6.3)', () => {
    expect(startBoard(2, [])).toEqual({ step: 2, recipe: EMPTY_RECIPE, checks: 0, verdict: null });
    expect(startBoard(0, ['sameTree']).recipe).toEqual(withoutCases(RIGHT_RECIPE, ['sameTree']));
  });

  it('a touch on a card puts it in or takes it back, and the last verdict is put away', () => {
    const checked = checkBoard(startBoard(0, [])).board;
    expect(checked.verdict?.right).toBe(false);
    const touched = touchCard(checked, 'markDarkSuns');
    expect(touched.recipe.mark).toBe('markDarkSuns');
    expect(touched.verdict).toBeNull();
    expect(touchCard(touched, 'markDarkSuns').recipe.mark).toBeNull();
  });

  it('a check judges the recipe as it stands and counts', () => {
    const board = checkBoard(checkBoard(startBoard(0, ['moon'])).board).board;
    expect(board.checks).toBe(2);
    expect(board.verdict).toEqual({
      right: false,
      failure: { kind: 'missing', card: 'moonNothing', case: 'moon' },
    });
    expect(checkBoard({ ...board, recipe: RIGHT_RECIPE }).verdict).toEqual({ right: true });
    expect(checkBoard({ ...board, recipe: RIGHT_RECIPE }).board.verdict).toEqual({ right: true });
  });
});

describe('the card the mentor places (a grade-3 hint)', () => {
  it('is the missing card of the first case that fails', () => {
    const fixed = mentorFix(withoutCases(RIGHT_RECIPE, ['sameTree']));
    expect(fixed).toEqual({ card: 'foldFlower', recipe: expect.anything() as Recipe });
    expect(checkRecipe(fixed?.recipe ?? EMPTY_RECIPE)).toEqual({ right: true });
  });

  it('takes a distractor back and puts the right card of its case instead', () => {
    const tempted: Recipe = { ...RIGHT_RECIPE, cases: [...RIGHT_RECIPE.cases, 'moonToSun'] };
    expect(mentorFix(tempted)?.recipe.cases).not.toContain('moonToSun');
    const forever: Recipe = { ...RIGHT_RECIPE, end: 'untilNoneDark' };
    expect(mentorFix(forever)).toEqual({ card: 'finishKeepMoons', recipe: RIGHT_RECIPE });
  });

  it('is none when the recipe is right', () => {
    expect(mentorFix(RIGHT_RECIPE)).toBeNull();
  });
});
