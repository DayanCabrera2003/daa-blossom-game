import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { searchWithFlowers } from '../edmonds/search';
import { nestedFlowers } from '../generators/hardCases';
import { createGraph } from '../graph/createGraph';
import { neighbors } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { isExposed, isMatchedEdge, mateOf } from '../matching/queries';
import type { Matching } from '../matching/types';
import { unwrap } from '../shared/result';
import { contract, openLayer } from './contract';
import { baseVertex, members, nestingDepth, nodesWithin, outermostNode } from './hierarchy';
import type { Blossom, GardenNode, Layer } from './types';

const sprout = (vertex: number): GardenNode => ({ kind: 'sprout', vertex });

// Level 5.1: R a b c d g h t = 0 1 2 3 4 5 6 7.
// F1 = triangle b–c=d–b with base b; F2 = R–a=F1–g=h–R with base R.
const f1: Blossom = {
  kind: 'blossom',
  id: 0,
  cycle: [sprout(2), sprout(3), sprout(4)],
  edges: [
    [2, 3],
    [3, 4],
    [4, 2],
  ],
};
const f2: Blossom = {
  kind: 'blossom',
  id: 1,
  cycle: [sprout(0), sprout(1), f1, sprout(5), sprout(6)],
  edges: [
    [0, 1],
    [1, 2],
    [3, 5],
    [5, 6],
    [6, 0],
  ],
};

describe('blossom hierarchy', () => {
  it('a sprout contains itself and is its own base', () => {
    expect(members(sprout(7))).toEqual([7]);
    expect(baseVertex(sprout(7))).toBe(7);
  });

  it('a flower contains every sprout of every flower inside it, in ascending order', () => {
    expect(members(f1)).toEqual([2, 3, 4]);
    expect(members(f2)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('the base sprout of a flower is the base of its base, all the way down', () => {
    expect(baseVertex(f1)).toBe(2);
    expect(baseVertex(f2)).toBe(0);
    const outer: Blossom = { ...f2, cycle: [f1, ...f2.cycle.slice(1)] };
    expect(baseVertex(outer)).toBe(2);
  });
});

describe('layers of a folded garden', () => {
  // Level 5.1 folded twice: F1 = {b, c, d} inside F2 = {R, a, F1, g, h}; t stays outside.
  const wild = unwrap(
    createGraph(8, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 4],
      [3, 5],
      [5, 6],
      [0, 6],
      [1, 7],
    ]),
  );
  const lanterns = unwrap(
    createMatching(wild, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
  );
  const first = contract(openLayer(wild, lanterns), [2, 3, 4]).layer;
  const second = contract(first, [0, 1, 2, 3, 4]).layer;

  it('a sprout lives in the outermost flower that contains it', () => {
    expect(outermostNode(second, 3)).toBe(second.nodes[0]);
    expect(outermostNode(first, 3)).toBe(first.nodes[2]);
    expect(outermostNode(second, 7)).toEqual({ kind: 'sprout', vertex: 7 });
  });

  it('counts how many flowers wrap a sprout (zoom levels of the Layers view)', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((v) => nestingDepth(second, v))).toEqual([
      1, 1, 2, 2, 2, 1, 1, 0,
    ]);
    expect(nestingDepth(openLayer(wild, lanterns), 3)).toBe(0);
  });

  it('sees what entered flowers fold, from the outside in (the Layers view, 5.2)', () => {
    expect(nodesWithin(second, [])).toBe(second.nodes);
    expect(nodesWithin(second, [1])).toBe((second.nodes[0] as Blossom).cycle);
    expect(nodesWithin(second, [1, 0])).toEqual([sprout(2), sprout(3), sprout(4)]);
    // A nested flower is not entered from outside, nor a flower that is not folded.
    expect(nodesWithin(second, [0])).toBeNull();
    expect(nodesWithin(second, [1, 0, 0])).toBeNull();
    expect(nodesWithin(first, [1])).toBeNull();
  });
});

/** Every node of a folded garden at every depth: its nodes, and the children of each flower. */
const everyNode = (nodes: readonly GardenNode[]): GardenNode[] =>
  nodes.flatMap((node) => (node.kind === 'blossom' ? [node, ...everyNode(node.cycle)] : [node]));

/** The folded gardens a search with flowers ends in: where it found a chain, or gave up. */
const foldedGarden = (graph: Graph, matching: Matching): Layer =>
  searchWithFlowers(graph, matching).layer;

/**
 * Whether an even alternating path runs from `from` to `to` through `inside` only, ending with a
 * lantern (or of length 0 when they are the same sprout): a depth-first walk over simple paths
 * that starts on a dark vine. Exponential, for small gardens only; it knows nothing of flowers.
 */
function evenWayInside(
  graph: Graph,
  matching: Matching,
  inside: ReadonlySet<VertexId>,
  from: VertexId,
  to: VertexId,
): boolean {
  if (from === to) return true;
  const walk = (path: VertexId[], nextLit: boolean): boolean => {
    const last = path[path.length - 1] as VertexId;
    return neighbors(graph, last).some((next) => {
      if (!inside.has(next) || path.includes(next)) return false;
      if (isMatchedEdge(matching, last, next) !== nextLit) return false;
      if (next === to && nextLit) return true;
      return walk([...path, next], !nextLit);
    });
  };
  return walk([from], false);
}

describe('what a nested flower keeps inside (Codex C9)', () => {
  it('property (Lemma 9.2): each node holds an odd number of sprouts, paired inside but its base', () => {
    const gardens = fc.oneof(
      graphWithMatchingArb({ maxN: 10 }),
      fc.integer({ min: 1, max: 4 }).map((k): [Graph, Matching] => {
        const { graph, matching } = nestedFlowers(k);
        return [graph, matching];
      }),
    );
    fc.assert(
      fc.property(gardens, ([graph, matching]) => {
        const layer = foldedGarden(graph, matching);
        for (const node of everyNode(layer.nodes)) {
          const inside = members(node);
          const base = baseVertex(node);
          expect(inside.length % 2).toBe(1);
          for (const v of inside.filter((sprout) => sprout !== base)) {
            const partner = mateOf(matching, v);
            expect(partner !== base && inside.includes(partner)).toBe(true);
          }
        }
        // On top, a node is in the dark exactly when its base is, and lanterns join bases.
        layer.nodes.forEach((node, id) => {
          const base = baseVertex(node);
          expect(isExposed(layer.matching, id)).toBe(isExposed(matching, base));
          const partner = mateOf(layer.matching, id);
          if (partner !== -1) {
            expect(mateOf(matching, base)).toBe(baseVertex(layer.nodes[partner] as GardenNode));
          }
        });
      }),
    );
  });

  it('property (Lemma 9.3): from the base to each sprout inside, an even way that ends lit', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, matching]) => {
        const layer = foldedGarden(graph, matching);
        for (const node of everyNode(layer.nodes)) {
          if (node.kind !== 'blossom') continue;
          const inside = new Set(members(node));
          for (const v of inside) {
            expect(evenWayInside(graph, matching, inside, baseVertex(node), v)).toBe(true);
          }
        }
      }),
    );
  });

  it('the way inside goes round by the lit side: b, d, c in the triangle of 4.1', () => {
    // b c d = 0 1 2, lantern c=d: from the base b, c is reached as b–d=c, never as b–c.
    const triangle = unwrap(
      createGraph(3, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
    );
    const lit = unwrap(createMatching(triangle, [[1, 2]]));
    expect(evenWayInside(triangle, lit, new Set([0, 1, 2]), 0, 1)).toBe(true);
    expect(evenWayInside(triangle, lit, new Set([0, 1]), 0, 1)).toBe(false);
  });
});
