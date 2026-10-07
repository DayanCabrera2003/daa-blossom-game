import { checkVertexCover, koenigCover } from '@core/certificates/vertexCover';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import { neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { isMatchedEdge } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { searchStatus } from '@core/search/searchStatus';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { buildCounterexample, type Counterexample } from '@levels/counterexample';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the greenhouse (GDD §7, chapter 3) that its gardens must really hold, checked with
 * the core: in 3.3 a moon is reached from two suns and the false statement "a marked sprout means a
 * chain" is refuted by a garden without one; in 3.8 the failed search reaches every sprout, so its
 * moons are König's scarecrows, and "k scarecrows, exactly k lanterns" is refuted by a spare one.
 */

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The counterexample of statement `option` of level `id`, built. */
const counterexampleOf = (id: string, option: number): Counterexample => {
  const data = levelOf(id).data.notebook?.options[option]?.counterexample;
  if (data === undefined) throw new Error(`statement ${option} of ${id} has no counterexample`);
  const built = buildCounterexample(data);
  if (!built.ok) throw new Error(`the counterexample of statement ${option} does not build`);
  return built.value;
};

/** A sprout of a counterexample, by name. */
const sproutOf = (counterexample: Counterexample, name: string): VertexId => {
  const vertex = idOf(counterexample.labels, name);
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

/** Where a search stands, under the roots of the garden and without folding (chapter 3). */
const statusOf = (state: GardenState) =>
  searchStatus(state.layer, state.search, { roots: state.roots, foldAllowed: false });

/** The sprouts carrying the mark `mark` in a garden. */
const marked = (state: GardenState, mark: 'outer' | 'inner'): VertexId[] =>
  [...Array(state.graph.n).keys()].filter(
    (v) => state.search?.label[itemAt(state.layer.nodeOf, v)] === mark,
  );

describe('3.3: already visited', () => {
  it('its search ends without a chain, and some moon is reached from two suns', () => {
    const level = levelOf('3.3');
    const end = play(level.start, level.solution);
    expect(statusOf(end)).toBe('exhausted');
    const suns = marked(end, 'outer');
    const twice = marked(end, 'inner').filter(
      (moon) =>
        neighbors(end.graph, moon).filter(
          (v) => suns.includes(v) && !isMatchedEdge(end.matching, v, moon),
        ).length >= 2,
    );
    expect(twice.length).toBeGreaterThan(0);
  });

  it('(c): reaching a marked sprout again is no sign of a chain', () => {
    const counterexample = counterexampleOf('3.3', 2);
    const id = (name: string): VertexId => sproutOf(counterexample, name);
    const searched = play(counterexample.start, [
      { type: 'markRoot', vertex: id('R') },
      { type: 'markMoon', from: id('R'), to: id('a') },
      { type: 'markMoon', from: id('b'), to: id('c') },
    ]);
    const again = applyAction(searched, { type: 'markMoon', from: id('d'), to: id('a') });
    expect(again).toMatchObject({ ok: false, reason: { code: 'alreadyMarked' } });
    expect(statusOf(searched)).toBe('exhausted');
  });
});

describe('3.8: the gift of the search', () => {
  const level = () => levelOf('3.8');
  /** The walkthrough's moves before its first scarecrow: the search, and nothing else. */
  const search = (): readonly Action[] => {
    const moves = level().solution;
    const first = moves.findIndex((move) => move.type === 'placeScarecrow');
    return first === -1 ? moves : moves.slice(0, first);
  };

  it('its search fails and reaches every sprout', () => {
    const end = play(level().start, search());
    expect(statusOf(end)).toBe('exhausted');
    const unmarked = [...Array(end.graph.n).keys()].filter(
      (v) => end.search?.label[itemAt(end.layer.nodeOf, v)] === 'none',
    );
    expect(unmarked).toEqual([]);
  });

  it('puts a scarecrow on every moon of that search, and they guard every vine', () => {
    const { start, solution } = level();
    const end = play(start, search());
    if (end.search === null) throw new Error('the walkthrough marks nothing');
    const placed = solution.flatMap((move) =>
      move.type === 'placeScarecrow' ? [move.vertex] : [],
    );
    expect([...placed].sort((a, b) => a - b)).toEqual(marked(end, 'inner'));
    expect(koenigCover(end.graph, end.search)).toEqual(marked(end, 'inner'));
    expect(checkVertexCover(end.graph, placed).ok).toBe(true);
  });

  it('(b): two scarecrows guard every vine, and still only one lantern fits', () => {
    const counterexample = counterexampleOf('3.8', 1);
    const { graph } = counterexample.start;
    const spare = [sproutOf(counterexample, 'A'), sproutOf(counterexample, 'C')];
    expect(checkVertexCover(graph, spare).ok).toBe(true);
    expect(maximumSize(graph)).toBe(1);
  });
});
