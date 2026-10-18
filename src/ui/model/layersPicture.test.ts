import { describe, expect, it } from 'vitest';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { replaySteps } from './diagramReplay';
import { flowerInside, layersOverlay } from './layersPicture';
import { fitGarden } from './miniGarden';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const nested: DiagramGarden = unwrap(diagramGarden({ level: '5.1' }, sources));
const layout = fitGarden(nested.positions);
const edges = nested.start.graph.edges;

// The day of Edmonds in 5.1 folds a flower and then a flower round it.
const day = unwrap(replaySteps(nested, 'edmonds'));
const deepest = day.find((step) =>
  step.moment.snapshot.flowers.some((flower) => flower.parent !== null),
);

describe('a flower seen from inside, in C9', () => {
  it('finds a step of 5.1 with a flower folded inside another', () => {
    expect(deepest).toBeDefined();
  });

  it('lights all the sprouts of the outer flower, and the flower inside it in its own colour', () => {
    const flowers = deepest?.moment.snapshot.flowers ?? [];
    const outer = flowers.find((flower) => flower.parent === null);
    const inner = flowers.filter((flower) => flower.parent === outer?.id);
    const overlay = layersOverlay(flowers, outer?.id ?? null, layout, edges);
    expect(overlay.groups.map((group) => group.tone)).toEqual([
      'chosen',
      ...inner.map(() => 'inner'),
    ]);
    expect(overlay.groups[0]?.sprouts).toHaveLength(outer?.members.length ?? 0);
    expect(flowerInside(flowers, outer?.id ?? null)).toEqual({
      base: outer?.base,
      sprouts: outer?.members.length,
      inner: inner.length,
    });
  });

  it('lights nothing for a flower not folded at the step shown', () => {
    const dawn = day[0]?.moment.snapshot.flowers ?? [];
    expect(layersOverlay(dawn, 0, layout, edges).groups).toEqual([]);
    expect(flowerInside(dawn, 0)).toBeNull();
    expect(flowerInside(dawn, null)).toBeNull();
  });
});
