import { idOf } from '@core/graph/labels';
import { degree, neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { checkAugmentingPath } from '@core/matching/paths';
import { isExposed, isMatchedEdge, mateOf } from '@core/matching/queries';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The designs of the secret flowers (plan 08, section 1.1) that the general integrity checks do
 * not see, checked with the core on the real level files: each flower combines ideas of its
 * chapter, and these tests make sure its garden really holds the trap it was drawn for.
 */

/** The secret flowers of these tests, by id. */
const FLOWERS = ['1.10'] as const;

/** Closest two sprouts of a secret flower may sit, in pixels: twice a sprout's radius and air. */
const MIN_SPACING = 18;

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** A sprout of a level, by name. */
const sproutOf = (level: Level, name: string): VertexId => {
  const vertex = idOf(level.labels, name);
  if (vertex === undefined) throw new Error(`no sprout ${name}`);
  return vertex;
};

/**
 * Every winning chain that starts at `from`, found by trying every path: dark vine out of a sun,
 * lit vine back, never a sprout twice, ending on a sprout in the dark.
 */
function chainsFrom(level: Level, from: VertexId): VertexId[][] {
  const { graph, matching } = level.start;
  const found: VertexId[][] = [];
  const walk = (path: VertexId[]): void => {
    const last = path[path.length - 1] as VertexId;
    for (const next of neighbors(graph, last)) {
      if (path.includes(next) || isMatchedEdge(matching, last, next)) continue;
      if (isExposed(matching, next)) {
        found.push([...path, next]);
        continue;
      }
      const mate = mateOf(matching, next);
      if (path.includes(mate)) continue;
      walk([...path, next, mate]);
    }
  };
  walk([from]);
  return found;
}

describe('the secret flowers', () => {
  it.each(FLOWERS)('%s is a secret flower', (id) => {
    expect(levelOf(id).data.secret).toBeDefined();
  });

  it.each(FLOWERS)('%s keeps its sprouts apart, never closer than 18 px', (id) => {
    const { sprouts } = levelOf(id).data;
    for (const [i, a] of sprouts.entries()) {
      for (const b of sprouts.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.label}–${b.label}`).toBeGreaterThanOrEqual(
          MIN_SPACING,
        );
      }
    }
  });
});

describe('1.10: twelve dead ends', () => {
  const level = () => levelOf('1.10');

  it('has exactly one winning chain from R, through twelve sprouts', () => {
    const chains = chainsFrom(level(), sproutOf(level(), 'R'));
    const { graph, matching } = level().start;
    for (const chain of chains) expect(checkAugmentingPath(graph, matching, chain).ok).toBe(true);
    expect(chains).toHaveLength(1);
    expect(chains[0]).toHaveLength(12);
  });

  it('the reference walkthrough lights that chain', () => {
    const chains = chainsFrom(level(), sproutOf(level(), 'R'));
    expect(level().solution).toEqual([{ type: 'chain', path: chains[0] }]);
  });

  it('has twelve dead-end vines, each to a lantern whose other sprout has no other vine', () => {
    const { graph, matching } = level().start;
    const deadEnds = graph.edges.filter(
      ([u, v]) =>
        !isMatchedEdge(matching, u, v) &&
        [u, v].some((end) => {
          const mate = mateOf(matching, end);
          return mate >= 0 && degree(graph, mate) === 1;
        }),
    );
    expect(deadEnds).toHaveLength(12);
  });
});
