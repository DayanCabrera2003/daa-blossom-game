import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { createTranslator } from '@services/i18n';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { fitGarden } from './miniGarden';
import { placingNow, startPlacing, touchPlacing } from './placing';
import { liftTheMoons } from './stonesPlay';
import { stonesPicture, stonesWords } from './stonesPicture';

const t = createTranslator(strings);
const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

// 7.3, the propeller: C in the middle (0) with three triangles round it; four lanterns.
const propeller = gardenOf('7.3');
const layout = fitGarden(propeller.positions);

describe('the stones of C12', () => {
  it('in 7.3, lifting C leaves three odd groups for one stone: 3 − 1 = 2 in the dark at least', () => {
    const lifted = touchPlacing(startPlacing(propeller, 'stone'), 0);
    const picture = stonesPicture(layout, lifted);
    expect(picture.count).toEqual({ odd: 3, stones: 1, least: 2, dark: 2, lanterns: 4, bound: 4 });
    expect(picture.overlay.groups.map((group) => [group.tone, group.label])).toEqual([
      ['odd', '3'],
      ['odd', '3'],
      ['odd', '3'],
    ]);
    expect(picture.moment.stones).toEqual([0]);
    expect(stonesWords(picture.count, t)).toEqual([
      'Grupos impares: 3. Piedras: 1. Al menos 2 brotes se quedan a oscuras; ahora hay 2.',
      t('diagram.stones.tight', { lanterns: 4 }),
    ]);
  });

  it('with no stone, the whole garden is one group, and the bound is loose', () => {
    const picture = stonesPicture(layout, startPlacing(propeller, 'stone'));
    expect(picture.overlay.groups.map((group) => group.tone)).toEqual(['even']);
    expect(picture.count).toMatchObject({ odd: 0, least: 0, bound: 5 });
    expect(stonesWords(picture.count, t)[1]).toBe(t('diagram.stones.bound', { bound: 5 }));
  });

  it('in 7.4, lifting the moons gives stones that prove the lanterns are the most', () => {
    const moons = liftTheMoons(startPlacing(gardenOf('7.4'), 'stone'));
    const { graph, matching, stones } = placingNow(moons);
    expect(stones.length).toBeGreaterThan(0);
    expect(checkTutteBerge(graph, matching, stones).ok).toBe(true);
    expect(stones.every((v) => moons.marks?.[v] === 'inner')).toBe(true);
  });

  it('lifts nothing while a chain can still light one more lantern', () => {
    const fewer = gardenOf('1.1');
    const session = startPlacing(fewer, 'stone');
    expect(liftTheMoons(session)).toBe(session);
  });
});
