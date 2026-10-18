import { describe, expect, it } from 'vitest';
import type { Graph, VertexId } from '@core/graph/types';
import { neighbors } from '@core/graph/queries';
import { checkAugmentingPath } from '@core/matching/paths';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { clearCut, flowerOf, showChain, startCut, touchCut } from './cutPlay';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

// 4.11: R a b c d f g e h x t as 0…10; the flower b c d f g with its base b in the dark.
const open = gardenOf('4.11');
const flower = unwrap(flowerOf(open));

/** Every simple path of `graph`, as lists of sprouts, each read both ways. */
function simplePaths(graph: Graph): VertexId[][] {
  const paths: VertexId[][] = [];
  const grow = (path: VertexId[]): void => {
    paths.push(path);
    for (const next of neighbors(graph, path[path.length - 1] as VertexId)) {
      if (!path.includes(next)) grow([...path, next]);
    }
  };
  for (let v = 0; v < graph.n; v++) grow([v]);
  return paths;
}

/** Touches the sprouts of `path` in order. */
const draw = (path: readonly VertexId[]) =>
  path.reduce((session, v) => touchCut(session, open, flower, v), startCut());

describe('the cut at the flower of C8', () => {
  it('finds the flower of 4.11, base first, and nothing in a level that has none', () => {
    expect(flower).toEqual([2, 3, 4, 5, 6]);
    expect(flowerOf(gardenOf('1.1'))).toEqual({ ok: false, error: { code: 'noFlower' } });
  });

  it('cuts every chain of the open garden into a stretch that is a chain of the folded one', () => {
    const { graph, matching } = open.start;
    const chains = simplePaths(graph).filter(
      (path) => checkAugmentingPath(graph, matching, path).ok,
    );
    expect(chains.length).toBeGreaterThan(4);
    for (const chain of chains) {
      const result = draw(chain).result;
      if (result?.kind !== 'cut') throw new Error(`${chain.join(' ')} was not cut`);
      const { folded, projected } = result.cut;
      expect(checkAugmentingPath(folded.graph, folded.matching, projected).ok).toBe(true);
    }
  });

  it('says nothing while a chain is being drawn, and why a drawing ending in the dark is none', () => {
    // One sprout is no drawing yet; e – c stops on c, which is lit: the drawing goes on.
    expect(draw([0]).result).toBeNull();
    expect(draw([7, 3]).result).toBeNull();
    // e – c – b: e dark, c lit (with d), but c–b is dark: two dark vines in a row.
    const refused = draw([7, 3, 2]).result;
    expect(refused?.kind).toBe('notAChain');
  });

  it('takes back the last sprout touched again, and clears the drawing', () => {
    expect(touchCut(draw([7, 3]), open, flower, 3).drawn).toEqual([7]);
    expect(clearCut()).toEqual(startCut());
  });

  it('shows a chain the core finds, cut at the flower', () => {
    const shown = showChain(open, flower);
    expect(shown.result?.kind).toBe('cut');
    expect(checkAugmentingPath(open.start.graph, open.start.matching, shown.drawn).ok).toBe(true);
  });
});
