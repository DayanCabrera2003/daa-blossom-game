import { describe, expect, it } from 'vitest';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { size } from '@core/matching/queries';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { coverNow, onTheMoons, resetCover, startCover, touchCover, undoCover } from './coverPlay';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

// 3.8: bees and flowers, five lanterns, the most the garden holds.
const bees = gardenOf('3.8');

describe('the scarecrows of C5', () => {
  it('starts with no scarecrow, allowing only to place and take them', () => {
    const session = startCover(bees);
    expect(coverNow(session).scarecrows).toEqual([]);
    expect([...coverNow(session).allowed].sort()).toEqual(['placeScarecrow', 'removeScarecrow']);
    expect(session.marks).toBeNull();
  });

  it('places a scarecrow on a touched sprout and takes it off on a second touch', () => {
    const placed = touchCover(startCover(bees), 1);
    expect(coverNow(placed).scarecrows).toEqual([1]);
    expect(placed.history).toHaveLength(2);
    expect(coverNow(touchCover(placed, 1)).scarecrows).toEqual([]);
  });

  it('in 3.8, sets them on the moons: they guard every vine, one per lantern', () => {
    const moons = onTheMoons(touchCover(startCover(bees), 0));
    const { graph, matching, scarecrows } = coverNow(moons);
    expect(checkVertexCover(graph, scarecrows).ok).toBe(true);
    expect(scarecrows).toHaveLength(size(matching));
    // The search behind them is shown: every scarecrow stands on a moon or a sprout it never reached.
    expect(moons.marks).not.toBeNull();
    expect(scarecrows.some((v) => moons.marks?.[v] === 'inner')).toBe(true);
    // The marks belong to that search: the next touch wipes them.
    expect(touchCover(moons, 0).marks).toBeNull();
  });

  it('leaves a garden that is not of bees and flowers as it is', () => {
    const triangle = gardenOf('4.1');
    const session = startCover(triangle);
    expect(onTheMoons(session)).toBe(session);
  });

  it('undoes one touch at a time, and starts again with no scarecrow', () => {
    const twice = touchCover(touchCover(startCover(bees), 1), 2);
    expect(coverNow(undoCover(twice)).scarecrows).toEqual([1]);
    expect(coverNow(resetCover(twice)).scarecrows).toEqual([]);
    expect(undoCover(startCover(bees)).history).toHaveLength(1);
  });
});
