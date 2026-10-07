import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { searchStatus } from '@core/search/searchStatus';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the festival (GDD §7, chapter 4) that its gardens must really hold, checked with
 * the core. In 4.1 the light "lies": searched from R alone, without folding, the search ends with
 * no chain while the garden holds one more lantern.
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
