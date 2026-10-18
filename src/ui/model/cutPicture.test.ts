import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { createTranslator } from '@services/i18n';
import { cutPicture } from './cutPicture';
import { flowerOf, startCut, touchCut } from './cutPlay';
import { cutWords } from './cutWords';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { fitGarden, MINI } from './miniGarden';

const t = createTranslator(strings);
const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};

// 4.11: R a b c d f g e h x t as 0…10; the flower b c d f g, base b; lanterns R=a c=d f=g h=x.
const open: DiagramGarden = unwrap(diagramGarden({ level: '4.11' }, sources));
const flower = unwrap(flowerOf(open));
const layout = fitGarden(open.positions, MINI.width / 2);
const draw = (path: readonly number[]) =>
  path.reduce((session, v) => touchCut(session, open, flower, v), startCut());

describe('the gardens of the cut at the flower of C8', () => {
  it('shows the open garden with its base marked, and the folded one with the flower', () => {
    const picture = cutPicture(open, layout, flower, startCut());
    expect(picture.open.moment.snapshot.flowers).toEqual([]);
    expect(picture.open.overlay.rings).toEqual([{ at: layout.at[2], tone: 'base' }]);
    expect(picture.folded.moment.snapshot.flowers).toEqual([
      { id: 0, base: 2, members: [2, 3, 4, 5, 6], parent: null },
    ]);
  });

  it('marks the stretch of a cut chain in both gardens, its ends and the petal it reaches', () => {
    // e – c = d – h = x – t: from e, outside, the first petal is c.
    const session = draw([7, 3, 4, 8, 9, 10]);
    const picture = cutPicture(open, layout, flower, session);
    expect(picture.open.overlay.strands).toHaveLength(1);
    expect(picture.open.overlay.rings.map((ring) => ring.tone)).toEqual([
      'end',
      'end',
      'base',
      'petal',
    ]);
    expect(picture.folded.overlay.strands).toEqual(picture.open.overlay.strands);
    expect(cutWords(session, open.names, t)).toBe(
      t('diagram.cut.stretch', { chain: 'e–c–d–h–x–t', outside: 'e', stretch: 'e–c' }),
    );
  });

  it('tells how to start, to go on, and why a drawing is no chain', () => {
    expect(cutWords(startCut(), open.names, t)).toBe(t('diagram.cut.start'));
    expect(cutWords(draw([7]), open.names, t)).toBe(t('diagram.cut.drawing'));
    expect(cutWords(draw([7, 3, 2]), open.names, t)).toMatch(/^[^‹]/);
  });

  it('says a chain that never touches the flower stays a chain once it is folded', () => {
    const session = draw([7, 3, 4, 8, 9, 10]);
    if (session.result?.kind !== 'cut') throw new Error('e–c–d–h–x–t is a chain');
    const away = {
      ...session,
      result: { kind: 'cut', cut: { ...session.result.cut, petal: null } },
    } as const;
    expect(cutWords(away, open.names, t)).toBe(t('diagram.cut.away', { chain: 'e–c–d–h–x–t' }));
    expect(cutPicture(open, layout, flower, away).open.overlay.rings).toHaveLength(3);
  });
});
