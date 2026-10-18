import type { Blossom, GardenNode } from '@core/blossom/types';
import { checkTutteBerge, tutteBergeBound } from '@core/certificates/tutteBerge';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { encodeGarden } from '@core/codes/gardenCode';
import { runOf } from '@core/cost/benchmark';
import { nestedFlowers } from '@core/generators/hardCases';
import { createGraph } from '@core/graph/createGraph';
import { idOf } from '@core/graph/labels';
import { degree, neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { createMatching } from '@core/matching/createMatching';
import { checkAugmentingPath } from '@core/matching/paths';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import { isExposed, isMatchedEdge, matchedEdges, mateOf, size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { searchStatus } from '@core/search/searchStatus';
import { itemAt } from '@core/shared/itemAt';
import { unwrap } from '@core/shared/result';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { racesOf } from '@levels/races';
import { describe, expect, it } from 'vitest';

/**
 * The designs of the secret flowers (plan 08, section 1.1) that the general integrity checks do
 * not see, checked with the core on the real level files: each flower combines ideas of its
 * chapter, and these tests make sure its garden really holds the trap it was drawn for.
 */

/** The secret flowers of these tests, by id. */
const FLOWERS = ['1.10', '2.5', '3.10', '4.13', '5.6', '6.7', '7.6'] as const;

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

describe('2.5: how many threads win', () => {
  const level = () => levelOf('2.5');
  /** The pieces of the tangle, from your lanterns to the reflection's. */
  const pieces = () => {
    const { start, mirror } = level();
    if (mirror === null) throw new Error('2.5 has no reflection');
    return decomposeSymmetricDifference(start.matching, mirror);
  };

  it('the reflection wins two pieces and loses one, though it holds only one lantern more', () => {
    const gains = pieces().map((piece) => piece.gain);
    expect(gains.filter((gain) => gain > 0)).toEqual([1, 1]);
    expect(gains.filter((gain) => gain < 0)).toEqual([-1]);
    const { start, mirror } = level();
    expect(size(mirror ?? start.matching) - size(start.matching)).toBe(1);
  });

  it('the walkthrough answers two before it lights the two winning threads', () => {
    const { walkthrough, solution } = level();
    expect(walkthrough.find((entry) => entry.type === 'answer')).toEqual({
      type: 'answer',
      option: 2,
    });
    const end = play(level().start, solution);
    expect(size(end.matching)).toBe(10);
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

describe('4.13: the order does not matter', () => {
  const level = () => levelOf('4.13');
  const sprout = (name: string) => sproutOf(level(), name);
  const folds = () => level().solution.filter((move) => move.type === 'foldAt');
  /** The walkthrough's moves before its first fold: the marks of the search from R. */
  const marks = () => {
    const moves = level().solution;
    return moves.slice(
      0,
      moves.findIndex((move) => move.type === 'foldAt'),
    );
  };
  /** Every order of a list. */
  const orders = <T>(items: readonly T[]): T[][] =>
    items.length <= 1
      ? [[...items]]
      : items.flatMap((item, i) =>
          orders([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
        );

  it('the walkthrough folds the flower under R first and the one T hangs from last', () => {
    expect(folds().map((move) => (move.type === 'foldAt' ? move.to : -1))).toEqual(
      ['l', 'd', 'h'].map(sprout),
    );
    expect(neighbors(level().graph, sprout('T'))).toEqual([sprout('i')]);
  });

  it('in every order of folding the three flowers, the same chain reaches T', () => {
    const reference = play(level().start, level().solution);
    for (const order of orders(folds())) {
      const folded = play(level().start, [
        ...marks(),
        ...order,
        { type: 'markMoon', from: sprout('i'), to: sprout('T') },
      ]);
      const flower = itemAt(folded.layer.nodes, itemAt(folded.layer.nodeOf, sprout('i')));
      if (flower.kind !== 'blossom') throw new Error('i is not inside a folded flower');
      const chain = ['R', 'a', 'b', 'g', 'h', 'j', 'i', 'T'].map(sprout);
      const end = play(folded, [
        { type: 'unfold', blossom: flower.id },
        { type: 'chain', path: chain },
      ]);
      expect(size(end.matching)).toBe(8);
      expect(end.matching).toEqual(reference.matching);
    }
  });
});

describe('5.6: four flowers, one inside another', () => {
  const level = () => levelOf('5.6');

  it('is the garden of four nested flowers with an exit from a to t, by its garden code', () => {
    const nested = nestedFlowers(3);
    const t = nested.graph.n;
    const graph = unwrap(createGraph(t + 1, [...nested.graph.edges, [sproutOf(level(), 'a'), t]]));
    const matching = unwrap(createMatching(graph, matchedEdges(nested.matching)));
    expect(encodeGarden(level().graph, level().start.matching)).toBe(encodeGarden(graph, matching));
    expect(sproutOf(level(), 't')).toBe(t);
  });

  it('folds four flowers, each inside the next, before it unfolds them from the outside in', () => {
    const { start, solution } = level();
    const firstUnfold = solution.findIndex((move) => move.type === 'unfold');
    const folded = play(start, solution.slice(0, firstUnfold));
    /** How many flowers deep a node goes: 0 for a sprout. */
    const depth = (node: GardenNode): number =>
      node.kind === 'blossom' ? 1 + Math.max(...node.cycle.map((child) => depth(child))) : 0;
    const flowers = folded.layer.nodes.filter((node): node is Blossom => node.kind === 'blossom');
    expect(flowers.map((flower) => depth(flower))).toEqual([4]);
    const unfolds = solution.flatMap((move) => (move.type === 'unfold' ? [move.blossom] : []));
    expect(unfolds).toEqual([3, 2, 1, 0]);
  });
});

describe('6.7: when is thinking worth it', () => {
  const level = () => levelOf('6.7');
  /** Each race of the level: its garden's size, and the steps of the automaton and of Bruto. */
  const races = () =>
    racesOf(level().flow).map(({ race, result }) => ({
      size: race.size,
      automaton: runOf(result, 'automaton').steps,
      bruto: runOf(result, 'bruto').steps,
      asleep: runOf(result, 'bruto').asleep,
    }));

  it('races four gardens of 4, 5, 6 and 8 sprouts, and Bruto finishes every one', () => {
    expect(races().map((race) => race.size)).toEqual([4, 5, 6, 8]);
    expect(races().every((race) => !race.asleep)).toBe(true);
  });

  it('Bruto takes fewer steps in the two tiny gardens, and more in the two larger ones', () => {
    const [first, second, third, fourth] = races();
    for (const race of [first, second]) expect(race?.bruto).toBeLessThan(race?.automaton ?? 0);
    for (const race of [third, fourth]) expect(race?.bruto).toBeGreaterThan(race?.automaton ?? 0);
  });

  it('asks when thinking pays, and only "when the garden grows" is right', () => {
    const ask = level().flow.find((step) => step.step === 'ask');
    if (ask?.step !== 'ask') throw new Error('6.7 asks when thinking pays');
    expect(ask.options.map((option) => option.correct)).toEqual([true, false, false]);
  });
});

describe('7.6: another proof', () => {
  const level = () => levelOf('7.6');
  const names = (stones: readonly VertexId[]) =>
    stones.map((stone) => level().data.sprouts[stone]?.label);

  it('four lanterns fit, and four sets of stones prove it: none, b, M, and b with M', () => {
    const { graph } = level();
    const proving = [...Array(2 ** graph.n).keys()]
      .map((subset) => [...Array(graph.n).keys()].filter((v) => (subset >> v) & 1))
      .filter((stones) => tutteBergeBound(graph, stones) === 4);
    expect(proving.map(names)).toEqual([[], ['b'], ['M'], ['b', 'M']]);
  });

  it('the walkthrough presents two different sets of stones, and both prove its lanterns', () => {
    const { start, solution } = level();
    const presented: VertexId[][] = [];
    let state = start;
    for (const move of solution) {
      state = play(state, [move]);
      if (move.type === 'declareDone') presented.push([...state.stones].sort((x, y) => x - y));
    }
    expect(presented.map(names)).toEqual([[], ['M']]);
    for (const stones of presented) {
      expect(checkTutteBerge(state.graph, state.matching, stones).ok).toBe(true);
    }
  });
});
