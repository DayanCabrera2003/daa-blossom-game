import { RECIPE_CARDS, RECIPE_CASES } from '@core/recipe/recipe';
import { describe, expect, it } from 'vitest';
import { catalog, compareLevelIds } from './catalog';
import { cardTextKey, failureTextKey, RECALL_KEY, TAUGHT_IN, taughtIn } from './recipeCards';

describe('the recipe cards as content', () => {
  it('recall, for every case, a level of chapters 3 and 4 that exists', () => {
    const ids = new Set(catalog().map((level) => level.data.id));
    for (const recipeCase of RECIPE_CASES) {
      const level = TAUGHT_IN[recipeCase];
      expect(ids.has(level)).toBe(true);
      expect(compareLevelIds(level, '3.1')).toBeGreaterThanOrEqual(0);
      expect(compareLevelIds(level, '5.1')).toBeLessThan(0);
    }
  });

  it('recall the levels the GDD names: two gardeners for root to root, folding for the flower', () => {
    expect(taughtIn({ kind: 'missing', card: 'chainRootToRoot', case: 'otherTree' })).toBe('3.4');
    expect(taughtIn({ kind: 'distractor', card: 'foldAnyLoop', case: 'sameTree' })).toBe('4.4');
    expect(TAUGHT_IN.moon).toBe('3.3');
  });

  it('give every card its text, and every failure the text of its card or of its case', () => {
    expect(RECIPE_CARDS.map((card) => cardTextKey(card.id))).toContain('recipe.card.foldFlower');
    expect(failureTextKey({ kind: 'distractor', card: 'moonToSun', case: 'moon' })).toBe(
      'recipe.wrong.moonToSun',
    );
    expect(failureTextKey({ kind: 'missing', card: 'foldFlower', case: 'sameTree' })).toBe(
      'recipe.missing.sameTree',
    );
    expect(RECALL_KEY).toBe('recipe.recall');
  });
});
