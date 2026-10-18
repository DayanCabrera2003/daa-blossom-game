import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { createTranslator } from '@services/i18n';
import { coverPicture, coverWords } from './coverPicture';
import { onTheMoons } from './coverPlay';
import { startPlacing, touchPlacing } from './placing';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { fitGarden } from './miniGarden';

const t = createTranslator(strings);
const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const bees: DiagramGarden = unwrap(diagramGarden({ level: '3.8' }, sources));
const layout = fitGarden(bees.positions);

describe('the picture of the scarecrows of C5', () => {
  it('marks the vines a scarecrow guards, and counts them with the scarecrows and lanterns', () => {
    // Sprout 1 (the flower "2") guards the vines 1–2 and 2–3.
    const picture = coverPicture(layout, touchPlacing(startPlacing(bees, 'scarecrow'), 1));
    expect(picture.overlay.strands.map((strand) => strand.tone)).toEqual(['guarded', 'guarded']);
    expect(picture.moment.scarecrows).toEqual([1]);
    expect(picture.count).toEqual({
      guarded: 2,
      vines: 11,
      scarecrows: 1,
      lanterns: 5,
      covers: false,
    });
  });

  it('on the moons, guards every vine and shows the marks of the search', () => {
    const picture = coverPicture(layout, onTheMoons(startPlacing(bees, 'scarecrow')));
    expect(picture.count).toMatchObject({ guarded: 11, scarecrows: 5, covers: true });
    expect(picture.moment.snapshot.label).toContain('inner');
  });

  it('says how much is guarded and, once all is, what that proves', () => {
    const none = coverPicture(layout, startPlacing(bees, 'scarecrow')).count;
    expect(coverWords(none, t)).toEqual([
      'Enredaderas vigiladas: 0 de 11. Espantapájaros: 0. Faroles: 5.',
    ]);
    const moons = coverPicture(layout, onTheMoons(startPlacing(bees, 'scarecrow'))).count;
    expect(coverWords(moons, t)).toEqual([
      'Enredaderas vigiladas: 11 de 11. Espantapájaros: 5. Faroles: 5.',
      t('diagram.cover.tight'),
    ]);
    expect(coverWords({ ...moons, scarecrows: 6 }, t)[1]).toBe(
      t('diagram.cover.all', { scarecrows: 6 }),
    );
  });
});
