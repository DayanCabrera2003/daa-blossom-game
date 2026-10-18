import { describe, expect, it } from 'vitest';
import { placedCards, RIGHT_RECIPE } from '@core/recipe/recipe';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { replaySteps } from './diagramReplay';
import { recipeCards, recipeDay } from './recipePicture';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

const kitchen = gardenOf('6.2');

describe('the recipe of C10, card by card', () => {
  it('lists the cards of the right recipe in its order: the start, the cases, the end', () => {
    expect(recipeCards()).toEqual(placedCards(RIGHT_RECIPE));
    expect(recipeCards()[0]).toBe('markDarkSuns');
    expect(recipeCards().at(-1)).toBe('finishKeepMoons');
  });

  it('in 6.2, walks the day of the mechanical gardener, each step lit by a card of the right recipe', () => {
    const day = unwrap(recipeDay(kitchen));
    expect(day.map((step) => step.moment)).toEqual(
      unwrap(replaySteps(kitchen, 'recipe')).map((step) => step.moment),
    );
    expect(day[0]?.card).toBeNull();
    const right = new Set(recipeCards());
    for (const step of day.slice(1)) expect(right.has(step.card ?? 'moonToSun')).toBe(true);
    expect(day[1]?.card).toBe('markDarkSuns');
    expect(day.at(-1)?.card).toBe('finishKeepMoons');
    // The day of 6.2 grows moons and lights a chain from root to root.
    const used = new Set(day.map((step) => step.card));
    expect(used.has('growMoon')).toBe(true);
    expect(used.has('chainRootToRoot')).toBe(true);
  });
});
