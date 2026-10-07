import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { handle, openController } from './levelController';
import { recipeBoardOf } from './levelSession';

/** A pair of sprouts whose script is the recipe of 6.3, without the flower's card. */
const level = (): Level => {
  const loaded = loadLevel({
    id: '6.3',
    sprouts: [
      { label: 'a', x: 100, y: 100 },
      { label: 'b', x: 200, y: 100 },
    ],
    vines: [['a', 'b']],
    goal: { visible: false },
    flow: [{ step: 'recipe', missing: ['sameTree'] }],
    solution: [{ type: 'tapGarden' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

describe('the level controller in the recipe step', () => {
  it('a card touched goes into the recipe, and a check tells what the core found', () => {
    const opened = openController(level(), 0);
    expect(opened.effects).toEqual([{ kind: 'recipe', step: 0, missing: ['sameTree'] }]);

    const wrong = handle(opened.controller, { kind: 'checkRecipe' }, 0);
    expect(wrong.effects).toEqual([
      {
        kind: 'recipeChecked',
        verdict: {
          right: false,
          failure: { kind: 'missing', card: 'foldFlower', case: 'sameTree' },
        },
      },
    ]);

    const touched = handle(wrong.controller, { kind: 'recipeCard', card: 'foldFlower' }, 0);
    expect(touched.effects).toEqual([]);
    expect(recipeBoardOf(touched.controller.session)?.recipe.cases).toContain('foldFlower');

    const right = handle(touched.controller, { kind: 'checkRecipe' }, 0);
    expect(right.effects[0]).toEqual({ kind: 'recipeChecked', verdict: { right: true } });
    expect(right.effects[1]).toMatchObject({ kind: 'won' });
  });

  it('after the step, a check shows nothing', () => {
    const { controller } = openController(level(), 0);
    const repaired = handle(controller, { kind: 'recipeCard', card: 'foldFlower' }, 0);
    const done = handle(repaired.controller, { kind: 'checkRecipe' }, 0);
    expect(handle(done.controller, { kind: 'checkRecipe' }, 0).effects).toEqual([]);
  });
});
