import { baseVertex, members } from '@core/blossom/hierarchy';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { searchStatus } from '@core/search/searchStatus';
import { findConflict } from '@core/search/conflict';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { buildCounterexample, type Counterexample } from '@levels/counterexample';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the festival (GDD §7, chapter 4) that its gardens must really hold, checked with
 * the core. In 4.1 the light "lies": searched from R alone, without folding, the search ends with
 * no chain while the garden holds one more lantern. In 4.2 that search meets itself at d–b, closing
 * a loop of 3, and "the light is confused by any loop" is refuted by a loop of 4 that confuses
 * nobody, as 4.3 shows again on a garden of its own.
 */

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

/** The counterexample of statement `option` of level `id`, built. */
const counterexampleOf = (id: string, option: number): Counterexample => {
  const data = levelOf(id).data.notebook?.options[option]?.counterexample;
  if (data === undefined) throw new Error(`statement ${option} of ${id} has no counterexample`);
  const built = buildCounterexample(data);
  if (!built.ok) throw new Error(`the counterexample of statement ${option} does not build`);
  return built.value;
};

/** Plays moves from a garden; every one must be accepted. */
const play = (from: GardenState, moves: readonly Action[]): GardenState =>
  moves.reduce((state, move) => {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(outcome.reason)}`);
    return outcome.state;
  }, from);

/** Where a search stands under the rules of the garden: its roots, folding if it is allowed. */
const statusOf = (state: GardenState) =>
  searchStatus(state.layer, state.search, {
    roots: state.roots,
    foldAllowed: state.allowed.has('foldAt'),
  });

describe('4.1: the festival begins (the light lies)', () => {
  const level = levelOf('4.1');
  const id = (name: string): VertexId => sproutOf(level, name);
  /** The search the design walks through: R a sun, a a moon, then c a moon by b–c. */
  const search: Action[] = [
    { type: 'markRoot', vertex: id('R') },
    { type: 'markMoon', from: id('R'), to: id('a') },
    { type: 'markMoon', from: id('b'), to: id('c') },
  ];

  it('the search may only start from R, and folding is not open yet', () => {
    expect(applyAction(level.start, { type: 'markRoot', vertex: id('e') })).toMatchObject({
      ok: false,
      reason: { code: 'notARoot' },
    });
    expect(level.start.allowed.has('foldAt')).toBe(false);
  });

  it("R's whole search ends without a chain, while the goal says 3", () => {
    const searched = play(level.start, search);
    expect(statusOf(searched)).toBe('exhausted');
    expect(searched.chainSeen).toBeNull();
    expect(applyAction(searched, { type: 'markMoon', from: id('d'), to: id('b') })).toMatchObject({
      ok: false,
      reason: { code: 'sunMeetsSun' },
    });
    expect(size(searched.matching)).toBe(2);
    expect(maximumSize(level.graph)).toBe(3);
  });

  it('yet the chain around the loop by the other side is there, found by hand', () => {
    const lit = play(play(level.start, search), [
      { type: 'chain', path: ['R', 'a', 'b', 'd', 'c', 'e'].map(id) },
    ]);
    expect(size(lit.matching)).toBe(3);
  });

  it('the lie depends on the order: looking along b–d before b–c finds the chain', () => {
    const other = play(level.start, [
      { type: 'markRoot', vertex: id('R') },
      { type: 'markMoon', from: id('R'), to: id('a') },
      { type: 'markMoon', from: id('b'), to: id('d') },
      { type: 'markMoon', from: id('c'), to: id('e') },
    ]);
    expect(other.chainSeen).not.toBeNull();
  });
});

describe('4.2: sun and moon at once', () => {
  const level = levelOf('4.2');
  const id = (name: string): VertexId => sproutOf(level, name);

  it('the search the player repeats meets itself at d–b, closing a loop of 3', () => {
    const searched = play(level.start, level.solution);
    expect(statusOf(searched)).toBe('exhausted');
    const conflict = findConflict(searched.layer, searched.search);
    expect(conflict?.vine).toEqual([id('b'), id('d')]);
    expect(conflict?.sprouts).toBe(3);
  });

  it('(b): a loop of 4 sprouts confuses no search, from either sprout in the dark', () => {
    const counterexample = counterexampleOf('4.2', 1);
    const sprout = (name: string): VertexId => {
      const vertex = idOf(counterexample.labels, name);
      if (vertex === undefined) throw new Error(`no sprout ${name}`);
      return vertex;
    };
    const look = (from: string, to: string): Action => ({
      type: 'markMoon',
      from: sprout(from),
      to: sprout(to),
    });
    const fromR = play(counterexample.start, [
      { type: 'markRoot', vertex: sprout('R') },
      look('R', 'a'),
      look('b', 'c'),
      look('b', 'e'),
    ]);
    // d meets e as a sun meets a moon: already marked, nothing strange.
    expect(applyAction(fromR, look('d', 'e'))).toMatchObject({ reason: { code: 'alreadyMarked' } });
    expect(findConflict(fromR.layer, fromR.search)).toBeNull();
    expect(applyAction(fromR, look('f', 'T'))).toMatchObject({ ok: true });
    const fromT = play(counterexample.start, [
      { type: 'markRoot', vertex: sprout('T') },
      look('T', 'f'),
      look('e', 'd'),
      look('e', 'b'),
    ]);
    expect(applyAction(fromT, look('c', 'b'))).toMatchObject({ reason: { code: 'alreadyMarked' } });
    expect(findConflict(fromT.layer, fromT.search)).toBeNull();
    expect(applyAction(fromT, look('a', 'R'))).toMatchObject({ ok: true });
  });
});

describe('4.3: even loops do not get in the way', () => {
  const level = levelOf('4.3');
  const id = (name: string): VertexId => sproutOf(level, name);

  it('the search from R walks the loop of 4 without the light meeting itself', () => {
    const searched = play(level.start, level.solution.slice(0, -1));
    expect(findConflict(searched.layer, searched.search)).toBeNull();
    expect(searched.chainSeen).not.toBeNull();
    // b reaches e, a moon already: nothing strange.
    expect(applyAction(searched, { type: 'markMoon', from: id('b'), to: id('e') })).toMatchObject({
      reason: { code: 'alreadyMarked' },
    });
  });
});

describe('4.5: unfold', () => {
  const level = levelOf('4.5');
  const id = (name: string): VertexId => sproutOf(level, name);
  const path = (names: string): VertexId[] => [...names].map(id);

  it('a chain may not cross the folded flower, and inside it only one side works', () => {
    const unfoldAt = level.solution.findIndex((move) => move.type === 'unfold');
    const folded = play(level.start, level.solution.slice(0, unfoldAt));
    expect(applyAction(folded, { type: 'chain', path: path('Rabdce') }).ok).toBe(false);
    const opened = play(folded, [{ type: 'unfold', blossom: 0 }]);
    // Cleo was reached asking: she has to give her lantern, so the side c–b breaks the chain.
    expect(applyAction(opened, { type: 'chain', path: path('Rabce') })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath' },
    });
    expect(size(play(opened, [{ type: 'chain', path: path('Rabdce') }]).matching)).toBe(3);
  });
});

describe('4.6: five petals', () => {
  const level = levelOf('4.6');
  const id = (name: string): VertexId => sproutOf(level, name);

  it('the opened flower lets the chain round the long side only', () => {
    const unfoldAt = level.solution.findIndex((move) => move.type === 'unfold');
    const opened = play(level.start, level.solution.slice(0, unfoldAt + 1));
    const short = ['R', 'a', 'b', 'c', 'e'].map(id);
    expect(applyAction(opened, { type: 'chain', path: short }).ok).toBe(false);
    const long = ['R', 'a', 'b', 'g', 'f', 'd', 'c', 'e'].map(id);
    expect(size(play(opened, [{ type: 'chain', path: long }]).matching)).toBe(4);
  });
});

describe('4.7: a flower with a long stem', () => {
  const level = levelOf('4.7');
  const id = (name: string): VertexId => sproutOf(level, name);

  it('the flower folded at the end of the stem has d for its base, whose lantern leaves it', () => {
    const foldAt = level.solution.findIndex((move) => move.type === 'foldAt');
    const folded = play(level.start, level.solution.slice(0, foldAt + 1));
    const flower = folded.layer.nodes.find((node) => node.kind === 'blossom');
    if (flower === undefined) throw new Error('no flower folded');
    expect(baseVertex(flower)).toBe(id('d'));
    expect(members(flower).sort()).toEqual([id('d'), id('e'), id('f')].sort());
    expect(members(flower)).not.toContain(level.start.matching.mate[id('d')]);
  });

  it('(c): with any petal but the base, the chain through the flower breaks', () => {
    const counterexample = counterexampleOf('4.7', 2);
    const sprout = (name: string): VertexId => {
      const vertex = idOf(counterexample.labels, name);
      if (vertex === undefined) throw new Error(`no sprout ${name}`);
      return vertex;
    };
    const chain = (names: string): Action => ({ type: 'chain', path: [...names].map(sprout) });
    // Out of the flower by its base b, the lantern a=b: the only chain that works.
    expect(applyAction(counterexample.start, chain('Rabdce')).ok).toBe(true);
    for (const names of ['Rabce', 'Rabcde']) {
      expect(applyAction(counterexample.start, chain(names)).ok).toBe(false);
    }
  });
});

describe('4.8: two flowers', () => {
  const level = levelOf('4.8');

  it('the chain crosses one flower: the other stays folded, and lighting it opens the garden', () => {
    const chainAt = level.solution.findIndex((move) => move.type === 'chain');
    const ready = play(level.start, level.solution.slice(0, chainAt));
    expect(ready.layer.nodes.filter((node) => node.kind === 'blossom')).toHaveLength(1);
    const lit = play(ready, level.solution.slice(chainAt));
    expect(lit.layer.nodes.every((node) => node.kind === 'sprout')).toBe(true);
    expect(size(lit.matching)).toBe(maximumSize(level.graph));
  });
});

describe('4.9: a flower without a chain', () => {
  const level = levelOf('4.9');

  it('the search folds the flower and still ends without a chain, on lanterns already the most', () => {
    const declareAt = level.solution.findIndex((move) => move.type === 'declareDone');
    const unfolded = play(level.start, level.solution.slice(0, declareAt - 1));
    expect(statusOf(unfolded)).toBe('conflict');
    const searched = play(level.start, level.solution.slice(0, declareAt));
    expect(statusOf(searched)).toBe('exhausted');
    expect(size(searched.matching)).toBe(maximumSize(level.graph));
  });
});
