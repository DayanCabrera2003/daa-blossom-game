import { describe, expect, it } from 'vitest';
import { size } from '@core/matching/queries';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { fitGarden } from './miniGarden';
import { POND_VIEWS, pondPicture, pondPieces, reflectionOf } from './pondPicture';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

// 2.1: the row 1…6 with your lanterns 2=3, 4=5 and the reflection's 1=2, 3=4, 5=6; the square
// a b c d lit two ways; e=f lit on both sides. As ids: 1…6 are 0…5, a b c d e f are 6…11.
const pond = gardenOf('2.1');
const mirror = unwrap(reflectionOf(pond));
const layout = fitGarden(pond.positions);

describe('the pond of C3', () => {
  it('finds the reflection of a level of the pond, and nothing in a garden without one', () => {
    expect(size(mirror)).toBe(6);
    expect(reflectionOf(gardenOf('1.1'))).toEqual({ ok: false, error: { code: 'noMirror' } });
  });

  it('in 2.1, lays the two sets of lanterns over each other: a thread that wins by one, a tied loop', () => {
    expect(pondPieces(pond.start.matching, mirror)).toEqual([
      { kind: 'thread', sprouts: [0, 1, 2, 3, 4, 5], yours: 2, mirror: 3, gain: 1 },
      { kind: 'loop', sprouts: [6, 7, 8, 9], yours: 2, mirror: 2, gain: 0 },
    ]);
  });

  it('shows your lanterns, the reflection, or both, with nothing else marked but the other side', () => {
    const yours = pondPicture(pond, layout, 'yours', mirror);
    expect(yours.moment.snapshot.mate).toEqual(pond.start.matching.mate);
    expect(yours.overlay.strands).toEqual([]);
    expect(pondPicture(pond, layout, 'mirror', mirror).moment.snapshot.mate).toEqual(mirror.mate);
    const together = pondPicture(pond, layout, 'together', mirror);
    expect(together.moment.snapshot.mate).toEqual(pond.start.matching.mate);
    expect(together.overlay.strands.map((strand) => strand.tone)).toEqual(
      new Array(6).fill('mirror'),
    );
  });

  it('parts the tangle into its pieces, each wrapped with its count, the pairs both light left lit', () => {
    const pieces = pondPicture(pond, layout, 'pieces', mirror);
    // Only e=f, lit on both sides, keeps its lantern in the garden.
    expect(pieces.moment.snapshot.mate.filter((mate) => mate !== -1)).toEqual([11, 10]);
    expect(pieces.overlay.groups.map((group) => [group.tone, group.label])).toEqual([
      ['gain', '+1'],
      ['tie', '0'],
    ]);
    const tones = pieces.overlay.strands.map((strand) => strand.tone);
    expect(tones.filter((tone) => tone === 'yours')).toHaveLength(4);
    expect(tones.filter((tone) => tone === 'mirror')).toHaveLength(5);
  });

  it('names a piece your lanterns win as a loss of the reflection', () => {
    const [piece] = pondPieces(mirror, pond.start.matching);
    expect(piece?.gain).toBe(-1);
    const flipped = { ...pond, start: { ...pond.start, matching: mirror } };
    const picture = pondPicture(flipped, layout, 'pieces', pond.start.matching);
    expect(picture.overlay.groups[0]).toMatchObject({ tone: 'loss', label: '−1' });
  });

  it('has a view for each button, in order', () => {
    expect(POND_VIEWS).toEqual(['yours', 'mirror', 'together', 'pieces']);
  });
});
