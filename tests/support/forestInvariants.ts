import { expect } from 'vitest';
import { hasEdge } from '../../src/core/graph/queries';
import type { Graph, VertexId } from '../../src/core/graph/types';
import { isExposed, mateOf } from '../../src/core/matching/queries';
import type { Matching } from '../../src/core/matching/types';
import { NO_VERTEX, type AlternatingForest } from '../../src/core/search/forest';
import { pathToRoot } from '../../src/core/search/pathToRoot';

/**
 * Asserts the invariants of an alternating forest (Códex C4) against its graph and matching:
 * - roots are in the dark, are suns, and head their own tree;
 * - every other sprout in the forest hangs from a marked parent of the same tree, along a vine;
 * - a moon hangs from a sun by a dark vine and has exactly one child, its lantern partner, a sun;
 * - a non-root sun hangs from its lantern partner;
 * - suns are at even distance from their root and moons at odd distance;
 * - unreached sprouts carry no parent and no root.
 */
export function expectForestInvariants(
  graph: Graph,
  matching: Matching,
  forest: AlternatingForest,
): void {
  const children = new Array<VertexId[]>(graph.n).fill([]).map(() => [] as VertexId[]);
  for (let v = 0; v < graph.n; v++) {
    const p = forest.parent[v] as VertexId;
    if (p !== NO_VERTEX) children[p]?.push(v);
  }

  for (let v = 0; v < graph.n; v++) {
    const label = forest.label[v];
    const parent = forest.parent[v] as VertexId;
    if (label === 'none') {
      expect(parent).toBe(NO_VERTEX);
      expect(forest.root[v]).toBe(NO_VERTEX);
      continue;
    }
    const depth = pathToRoot(forest, v).length - 1;
    expect(depth % 2).toBe(label === 'outer' ? 0 : 1);

    if (parent === NO_VERTEX) {
      expect(label).toBe('outer');
      expect(isExposed(matching, v)).toBe(true);
      expect(forest.root[v]).toBe(v);
      continue;
    }
    expect(hasEdge(graph, parent, v)).toBe(true);
    expect(forest.root[v]).toBe(forest.root[parent]);
    if (label === 'inner') {
      expect(forest.label[parent]).toBe('outer');
      expect(mateOf(matching, v)).not.toBe(parent);
      expect(children[v]).toEqual([mateOf(matching, v)]);
      expect(forest.label[mateOf(matching, v)]).toBe('outer');
    } else {
      expect(forest.label[parent]).toBe('inner');
      expect(mateOf(matching, v)).toBe(parent);
    }
  }
}
