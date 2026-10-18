import { describe, expect, it } from 'vitest';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { size } from '@core/matching/queries';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { onTheMoons } from './coverPlay';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { placingNow, startPlacing, touchPlacing } from './placing';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

// 3.8: bees and flowers, five lanterns, the most the garden holds.
const bees = gardenOf('3.8');

describe('the scarecrows of C5 on the moons', () => {
  it('in 3.8, sets them on the moons: they guard every vine, one per lantern', () => {
    const moons = onTheMoons(touchPlacing(startPlacing(bees, 'scarecrow'), 0));
    const { graph, matching, scarecrows } = placingNow(moons);
    expect(checkVertexCover(graph, scarecrows).ok).toBe(true);
    expect(scarecrows).toHaveLength(size(matching));
    // The search behind them is shown: they stand on its moons.
    expect(moons.marks).not.toBeNull();
    expect(scarecrows.some((v) => moons.marks?.[v] === 'inner')).toBe(true);
  });

  it('leaves a garden that is not of bees and flowers as it is', () => {
    const session = startPlacing(gardenOf('4.1'), 'scarecrow');
    expect(onTheMoons(session)).toBe(session);
  });
});
