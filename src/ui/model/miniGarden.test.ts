import { describe, expect, it } from 'vitest';
import { encodeGarden } from '@core/codes/gardenCode';
import { edmonds } from '@core/edmonds/solve';
import { createGraph } from '@core/graph/createGraph';
import { emptyMatching } from '@core/matching/createMatching';
import { applyAction } from '@core/rules/applyAction';
import { unwrap } from '@core/shared/result';
import { stateAt, type GardenSnapshot } from '@core/trace/replay';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { snapshotOf } from './gardenSnapshot';
import { fitGarden, MINI, miniGarden, type MiniMoment } from './miniGarden';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

/** A moment with nothing placed on the garden. */
const bare = (snapshot: GardenSnapshot): MiniMoment => ({ snapshot, scarecrows: [], stones: [] });

/** Every garden a diagram may show: the levels, the cards' tiny gardens and a ring of six. */
const ring = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [0, 5],
  ]),
);
const everyGarden: [string, DiagramGarden][] = [
  ...levels.map((level): [string, DiagramGarden] => [level.data.id, gardenOf(level.data.id)]),
  ...[...cards.keys()].map((card): [string, DiagramGarden] => [
    card,
    unwrap(diagramGarden({ card }, sources)),
  ]),
  ['ring', unwrap(diagramGarden({ code: encodeGarden(ring, emptyMatching(ring)) }, sources))],
];

describe('fitGarden', () => {
  it('fits every garden in the box, badges above and names below included, on whole pixels', () => {
    for (const [name, garden] of everyGarden) {
      const layout = fitGarden(garden.positions);
      expect({ name, width: layout.width }).toEqual({ name, width: MINI.width });
      expect(layout.height).toBeLessThanOrEqual(MINI.maxHeight);
      for (const { x, y } of layout.at) {
        expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
        expect(x - MINI.radius).toBeGreaterThanOrEqual(MINI.margin.side - MINI.radius);
        expect(x + MINI.radius).toBeLessThanOrEqual(MINI.width);
        expect(y - MINI.radius - MINI.badge).toBeGreaterThanOrEqual(0);
        expect(y + MINI.radius + MINI.nameHeight).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('keeps every two sprouts of a garden apart, so none hides another', () => {
    for (const [name, garden] of everyGarden) {
      const { at } = fitGarden(garden.positions);
      const closest = Math.min(
        ...at.flatMap((a, i) => at.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
      );
      expect({ name, apart: closest >= 2 * MINI.radius + 4 }).toEqual({ name, apart: true });
    }
  });

  it('never blows a small garden up past half again its size, and centres it', () => {
    const layout = fitGarden([
      { x: 100, y: 100 },
      { x: 120, y: 100 },
    ]);
    const [a, b] = layout.at;
    expect((b?.x ?? 0) - (a?.x ?? 0)).toBe(30);
    expect((a?.x ?? 0) + (b?.x ?? 0)).toBe(MINI.width);
  });

  it('fits a garden in a narrower box, for two gardens side by side', () => {
    const garden = gardenOf('4.11');
    const layout = fitGarden(garden.positions, MINI.width / 2);
    expect(layout.width).toBe(MINI.width / 2);
    expect(layout.height).toBeLessThanOrEqual(MINI.maxHeight);
    for (const { x } of layout.at) {
      expect(x).toBeGreaterThanOrEqual(MINI.margin.side);
      expect(x).toBeLessThanOrEqual(MINI.width / 2 - MINI.margin.side);
    }
  });

  it('puts a lone sprout in the middle', () => {
    const layout = fitGarden([{ x: 7, y: 9 }]);
    expect(layout.at).toEqual([{ x: MINI.width / 2, y: MINI.margin.top }]);
    expect(layout.height).toBe(MINI.margin.top + MINI.margin.bottom);
  });
});

describe('miniGarden', () => {
  it('lights the two sprouts of a lantern and hangs it at the middle of their vine', () => {
    const garden = gardenOf('1.1');
    const joined = applyAction(garden.start, { type: 'join', u: 1, v: 2 });
    if (!joined.ok) throw new Error('B–C is a vine of 1.1');
    const layout = fitGarden(garden.positions);
    const picture = miniGarden(garden, layout, bare(snapshotOf(joined.state)));
    expect(picture.sprouts.map((sprout) => sprout.lit)).toEqual([false, true, true, false]);
    expect(picture.sprouts.map((sprout) => sprout.label)).toEqual(['A', 'B', 'C', 'D']);
    const lit = picture.vines.filter((vine) => vine.lit);
    expect(lit.map(({ u, v }) => [u, v])).toEqual([[1, 2]]);
    const [b, c] = [layout.at[1], layout.at[2]];
    expect(lit[0]?.lantern).toEqual({
      x: ((b?.x ?? 0) + (c?.x ?? 0)) / 2,
      y: ((b?.y ?? 0) + (c?.y ?? 0)) / 2,
    });
    expect(picture.vines.find((vine) => !vine.lit)?.lantern).toBeNull();
    expect(picture.flowers).toEqual([]);
  });

  it('numbers the sprouts touched so far and marks the vines between them', () => {
    const garden = gardenOf('1.3');
    const picture = miniGarden(
      garden,
      fitGarden(garden.positions),
      bare(snapshotOf(garden.start)),
      [0, 1, 2],
    );
    expect(picture.sprouts.slice(0, 4).map((sprout) => sprout.touched)).toEqual([1, 2, 3, null]);
    const chosen = picture.vines.filter((vine) => vine.chosen).map(({ u, v }) => [u, v]);
    expect(chosen).toEqual([
      [0, 1],
      [1, 2],
    ]);
    const backwards = miniGarden(
      garden,
      fitGarden(garden.positions),
      bare(snapshotOf(garden.start)),
      [2, 1],
    );
    expect(backwards.vines.filter((vine) => vine.chosen).map(({ u, v }) => [u, v])).toEqual([
      [1, 2],
    ]);
  });

  it('wears the marks, scarecrows and stones of the moment', () => {
    const garden = gardenOf('1.1');
    const snapshot: GardenSnapshot = {
      mate: [-1, -1, -1, -1],
      label: ['outer', 'inner', 'none', 'none'],
      flowers: [],
    };
    const picture = miniGarden(garden, fitGarden(garden.positions), {
      snapshot,
      scarecrows: [2],
      stones: [3],
    });
    expect(picture.sprouts.map((sprout) => sprout.mark)).toEqual(['sun', 'moon', null, null]);
    expect(picture.sprouts.map((sprout) => sprout.scarecrow)).toEqual([false, false, true, false]);
    expect(picture.sprouts.map((sprout) => sprout.stone)).toEqual([false, false, false, true]);
  });

  it('folds the five petals of 4.6 into one flower round them, its base ringed', () => {
    const garden = gardenOf('4.6');
    // The reference solution marks the garden and folds where d and f meet.
    let state = garden.start;
    for (const move of garden.level?.solution ?? []) {
      const outcome = applyAction(state, move);
      if (!outcome.ok) throw new Error('the solution of 4.6 is accepted');
      state = outcome.state;
      if (move.type === 'foldAt') break;
    }
    const snapshot = snapshotOf(state);
    const layout = fitGarden(garden.positions);
    const picture = miniGarden(garden, layout, bare(snapshot));
    const [flower] = picture.flowers;
    const folded = snapshot.flowers[0];
    if (flower === undefined || folded === undefined) throw new Error('4.6 folds a flower');
    expect(flower).toMatchObject({ id: folded.id, depth: 0, petals: 5 });
    expect(flower.base).toEqual(layout.at[folded.base]);
    expect(flower.outline.length).toBeGreaterThan(5);
    expect(picture.sprouts.filter((sprout) => sprout.base).map((sprout) => sprout.vertex)).toEqual([
      folded.base,
    ]);
    const inside = picture.vines.filter((vine) => vine.inFlower);
    expect(inside.length).toBe(5);
    expect(
      inside.every((vine) => folded.members.includes(vine.u) && folded.members.includes(vine.v)),
    ).toBe(true);
  });

  it('draws a flower inside a flower deeper, each counting the other as one petal', () => {
    const garden = gardenOf('5.1');
    const run = edmonds(garden.start.graph, garden.start.matching);
    const moments = run.trace.map((_, k) => stateAt(garden.start.matching, run.trace, k + 1));
    const nested = moments.find((snapshot) => snapshot.flowers.some((f) => f.parent !== null));
    if (nested === undefined) throw new Error('5.1 nests a flower');
    const picture = miniGarden(garden, fitGarden(garden.positions), bare(nested));
    const outer = picture.flowers[0];
    const inner = picture.flowers.find((flower) => flower.depth === 1);
    expect(outer?.depth).toBe(0);
    expect(inner).toBeDefined();
    const outerFolded = nested.flowers.find((f) => f.id === outer?.id);
    const innerFolded = nested.flowers.find((f) => f.id === inner?.id);
    const loose = (outerFolded?.members.length ?? 0) - (innerFolded?.members.length ?? 0);
    expect(outer?.petals).toBe(loose + 1);
    expect(picture.sprouts.filter((sprout) => sprout.base)).toHaveLength(1);
  });
});
