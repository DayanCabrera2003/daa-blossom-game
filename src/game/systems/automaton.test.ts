import { size } from '@core/matching/queries';
import { RIGHT_RECIPE, withoutCases } from '@core/recipe/recipe';
import { runRecipe } from '@core/recipe/run';
import { describe, expect, it } from 'vitest';
import { automatonLevel } from '../../../tests/support/fixtureLevels';
import { automatonDay } from './automaton';

// The garden of 5.1: R a b c d g h t = 0…7, three lanterns and the most it holds is 4.
const { start } = automatonLevel();

describe('the day of the automaton running a recipe', () => {
  it('starts at the garden given and adds one state per move of the run', () => {
    const day = automatonDay(start, RIGHT_RECIPE);
    expect(day[0]).toBe(start);
    expect(day).toHaveLength(runRecipe(start, { fold: true }).length + 1);
    const dusk = day[day.length - 1];
    expect(dusk?.declaredDone).toBe(true);
    expect(dusk === undefined ? 0 : size(dusk.matching)).toBe(4);
  });

  it('without the fold card the run stops short, at 3 lanterns, and says it is done', () => {
    const day = automatonDay(start, withoutCases(RIGHT_RECIPE, ['sameTree']));
    const dusk = day[day.length - 1];
    expect(dusk?.declaredDone).toBe(true);
    expect(dusk === undefined ? 0 : size(dusk.matching)).toBe(3);
  });

  it('a recipe the automaton cannot run is a broken catalog', () => {
    expect(() => automatonDay(start, withoutCases(RIGHT_RECIPE, ['dark']))).toThrow();
    // So is a level whose garden refuses the automaton's moves.
    expect(() => automatonDay({ ...start, allowed: new Set() }, RIGHT_RECIPE)).toThrow();
  });
});
