import { describe, expect, it } from 'vitest';
import {
  cardOf,
  EMPTY_RECIPE,
  isPlaced,
  placedCards,
  placeCard,
  RECIPE_CARDS,
  RECIPE_CASES,
  RIGHT_RECIPE,
  rightCardOf,
  slotOf,
  takeCard,
  toggleCard,
  withoutCases,
} from './recipe';

describe('the recipe cards', () => {
  it('have one right card for every case of the search', () => {
    for (const recipeCase of RECIPE_CASES) {
      const right = RECIPE_CARDS.filter((card) => card.case === recipeCase && card.right);
      expect(right).toHaveLength(1);
      expect(rightCardOf(recipeCase).case).toBe(recipeCase);
    }
  });

  it('list the three distractors of the GDD, each against a case', () => {
    const distractors = RECIPE_CARDS.filter((card) => !card.right).map((card) => card.id);
    expect(distractors).toEqual(['moonToSun', 'foldAnyLoop', 'untilNoneDark']);
    expect(cardOf('untilNoneDark').case).toBe('end');
  });

  it('give every card a stable, distinct id', () => {
    const ids = RECIPE_CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('put the first case in the mark slot, the last in the end slot, the rest among the cases', () => {
    expect(slotOf('start')).toBe('mark');
    expect(slotOf('end')).toBe('end');
    expect(slotOf('sameTree')).toBe('cases');
  });
});

describe('building a recipe', () => {
  it('places a card in its slot, and a second mark or end card takes the place of the first', () => {
    const marked = placeCard(EMPTY_RECIPE, 'markDarkSuns');
    expect(marked.mark).toBe('markDarkSuns');
    const ended = placeCard(placeCard(marked, 'untilNoneDark'), 'finishKeepMoons');
    expect(ended.end).toBe('finishKeepMoons');
  });

  it('keeps the cases as a set: a card placed twice is there once', () => {
    const twice = placeCard(placeCard(EMPTY_RECIPE, 'foldFlower'), 'foldFlower');
    expect(twice.cases).toEqual(['foldFlower']);
  });

  it('takes a card back from wherever it is', () => {
    expect(takeCard(RIGHT_RECIPE, 'markDarkSuns').mark).toBeNull();
    expect(takeCard(RIGHT_RECIPE, 'finishKeepMoons').end).toBeNull();
    expect(takeCard(RIGHT_RECIPE, 'foldFlower').cases).not.toContain('foldFlower');
    expect(takeCard(EMPTY_RECIPE, 'foldFlower')).toEqual(EMPTY_RECIPE);
  });

  it('toggles a card: placed when out, taken back when in', () => {
    const placed = toggleCard(EMPTY_RECIPE, 'moonNothing');
    expect(isPlaced(placed, 'moonNothing')).toBe(true);
    expect(isPlaced(toggleCard(placed, 'moonNothing'), 'moonNothing')).toBe(false);
  });

  it('lists the cards placed, mark first and end last', () => {
    const recipe = placeCard(placeCard(EMPTY_RECIPE, 'finishKeepMoons'), 'growMoon');
    expect(placedCards(recipe)).toEqual(['growMoon', 'finishKeepMoons']);
    expect(placedCards(RIGHT_RECIPE)).toHaveLength(RECIPE_CASES.length);
  });

  it('removes the cards of some cases, as a broken recipe arrives (6.3)', () => {
    const broken = withoutCases(RIGHT_RECIPE, ['sameTree', 'start']);
    expect(broken.mark).toBeNull();
    expect(broken.cases).not.toContain('foldFlower');
    expect(broken.cases).toHaveLength(4);
    expect(broken.end).toBe('finishKeepMoons');
    expect(withoutCases(RIGHT_RECIPE, ['end']).end).toBeNull();
  });
});
