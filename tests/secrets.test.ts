import { checkVertexCover } from '@core/certificates/vertexCover';
import { idOf } from '@core/graph/labels';
import { degree, neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { checkAugmentingPath } from '@core/matching/paths';
import { isExposed, isMatchedEdge, mateOf, size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { searchStatus } from '@core/search/searchStatus';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The designs of the secret flowers (plan 08, section 1.1) that the general integrity checks do
 * not see, checked with the core on the real level files: each flower combines ideas of its
 * chapter, and these tests make sure its garden really holds the trap it was drawn for.
 */

/** The secret flowers of these tests, by id. */
const FLOWERS = ['1.10', '3.10'] as const;

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

/** Plays moves from a garden; every one must be accepted. */
const play = (from: GardenState, moves: readonly Action[]): GardenState =>
  moves.reduce((state, move) => {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(outcome.reason)}`);
    return outcome.state;
  }, from);

/** The sprouts carrying the mark `mark` in a garden. */
const marked = (state: GardenState, mark: 'outer' | 'inner' | 'none'): VertexId[] =>
  [...Array(state.graph.n).keys()].filter(
    (v) => state.search?.label[itemAt(state.layer.nodeOf, v)] === mark,
  );

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

describe('3.10: those the light does not reach', () => {
  const level = () => levelOf('3.10');
  /** The walkthrough's moves before its first scarecrow: the chain, then the search, nothing else. */
  const search = (): readonly Action[] => {
    const moves = level().solution;
    return moves.slice(
      0,
      moves.findIndex((move) => move.type === 'placeScarecrow'),
    );
  };
  const names = (vertices: readonly VertexId[]) =>
    vertices.map((vertex) => level().data.sprouts[vertex]?.label);

  it('after the chain, the search from S fails having reached only S, a and R', () => {
    const end = play(level().start, search());
    const status = searchStatus(end.layer, end.search, { roots: end.roots, foldAllowed: false });
    expect(status).toBe('exhausted');
    expect(names(marked(end, 'outer'))).toEqual(['R', 'S']);
    expect(names(marked(end, 'inner'))).toEqual(['a']);
  });

  it('scarecrows on the moons alone leave vines unguarded', () => {
    const end = play(level().start, search());
    expect(checkVertexCover(end.graph, marked(end, 'inner')).ok).toBe(false);
  });

  it("the walkthrough's scarecrows guard every vine, as many as the lanterns", () => {
    const { start, solution } = level();
    const end = play(start, solution);
    expect(checkVertexCover(end.graph, end.scarecrows).ok).toBe(true);
    expect(end.scarecrows).toHaveLength(size(end.matching));
    expect(names([...end.scarecrows].sort((a, b) => a - b))).toEqual([
      'a',
      'b',
      'd',
      'x',
      'z',
      'v',
    ]);
  });
});
