import { RECIPE_CARD_IDS } from '@core/recipe/recipe';
import { describe, expect, it } from 'vitest';
import { recipeLevel } from '../../../tests/support/fixtureLevels';
import { handle, startController, type Controller } from '../systems/levelController';
import { checkRecipe } from '@core/recipe/check';
import { checkFeedback, recipePicture, TABLE_ORDER } from './recipePanel';

/** The level controller after these events. */
const after = (controller: Controller, events: Parameters<typeof handle>[1][]): Controller =>
  events.reduce((current, event) => handle(current, event, 0).controller, controller);

describe('the picture of the recipe panel (6.1)', () => {
  it('lays every card on the table once, right ones and distractors mixed', () => {
    expect([...TABLE_ORDER].sort()).toEqual([...RECIPE_CARD_IDS].sort());
    expect(TABLE_ORDER.slice(0, 3).every((id) => id !== 'markDarkSuns')).toBe(true);
  });

  it('shows the empty recipe and the whole table as the step opens', () => {
    const picture = recipePicture(startController(recipeLevel(), 0).session);
    expect(picture).toMatchObject({ mark: null, cases: [], end: null });
    expect(picture?.table).toEqual(TABLE_ORDER);
  });

  it('moves a touched card from the table to its slot, cases in the order placed', () => {
    const controller = after(startController(recipeLevel(), 0), [
      { kind: 'recipeCard', card: 'moonNothing' },
      { kind: 'recipeCard', card: 'markDarkSuns' },
      { kind: 'recipeCard', card: 'chainToDark' },
    ]);
    const picture = recipePicture(controller.session);
    expect(picture?.mark).toBe('markDarkSuns');
    expect(picture?.cases).toEqual(['moonNothing', 'chainToDark']);
    expect(picture?.table).toHaveLength(RECIPE_CARD_IDS.length - 3);
    expect(picture?.table).not.toContain('moonNothing');
  });

  it('after a wrong check tells why, and recalls the level that taught the case', () => {
    const verdict = checkRecipe({ mark: 'markDarkSuns', cases: [], end: null });
    expect(verdict.right).toBe(false);
    if (verdict.right) return;
    expect(checkFeedback(verdict.failure)).toEqual([
      { key: 'recipe.missing.dark', params: {} },
      { key: 'recipe.recall', params: { level: '3.1' } },
    ]);
  });

  it('a distractor is told by its own text', () => {
    const verdict = checkRecipe({
      mark: 'markDarkSuns',
      cases: ['chainToDark', 'growMoon', 'chainRootToRoot', 'foldAnyLoop'],
      end: null,
    });
    expect(verdict.right ? null : checkFeedback(verdict.failure)[0]).toEqual({
      key: 'recipe.wrong.foldAnyLoop',
      params: {},
    });
  });

  it('a check leaves the cards where they are', () => {
    const before = after(startController(recipeLevel(), 0), [
      { kind: 'recipeCard', card: 'markDarkSuns' },
    ]);
    const checked = after(before, [{ kind: 'checkRecipe' }]);
    expect(recipePicture(checked.session)).toEqual(recipePicture(before.session));
  });

  it('there is no panel outside the recipe step', () => {
    const recipe = [
      'markDarkSuns',
      'chainToDark',
      'growMoon',
      'chainRootToRoot',
      'foldFlower',
      'moonNothing',
      'finishKeepMoons',
    ] as const;
    const controller = after(startController(recipeLevel(), 0), [
      ...recipe.map((card) => ({ kind: 'recipeCard' as const, card })),
      { kind: 'checkRecipe' },
    ]);
    expect(recipePicture(controller.session)).toBeNull();
  });
});
