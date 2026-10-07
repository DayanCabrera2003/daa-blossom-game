import { baseVertex, members } from '@core/blossom/hierarchy';
import type { Blossom, GardenNode } from '@core/blossom/types';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the wild garden (GDD §7, chapter 5) that its gardens must really hold, checked
 * with the core: a folded flower is one more sprout and can close a loop of its own, so flowers
 * nest; they unfold from the outside in, and the side taken inside an inner flower depends on
 * where the chain comes in and goes out.
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

/** The garden after the reference solution up to its `count`-th move of kind `type`, included. */
const after = (level: Level, type: Action['type'], count = 1): GardenState => {
  const at = level.solution.flatMap((move, index) => (move.type === type ? [index] : []));
  const last = at[count - 1];
  if (last === undefined) throw new Error(`no move ${type} number ${count}`);
  return play(level.start, level.solution.slice(0, last + 1));
};

/** The flowers folded in a garden, outermost only. */
const flowersOf = (state: GardenState): Blossom[] =>
  state.layer.nodes.filter((node): node is Blossom => node.kind === 'blossom');

/** The flowers a node folds directly, its children around the loop. */
const innerFlowers = (node: GardenNode): Blossom[] =>
  node.kind === 'blossom'
    ? node.cycle.filter((child): child is Blossom => child.kind === 'blossom')
    : [];

/** The kinds of steps of a level's script, in order. */
const stepsOf = (level: Level): string[] => level.flow.map((step) => step.step);

describe('5.1: a flower inside another', () => {
  const level = levelOf('5.1');
  const id = (name: string): VertexId => sproutOf(level, name);
  const names = (vertices: readonly VertexId[]): VertexId[] => [...vertices].sort((a, b) => a - b);
  const sprouts = (list: string): VertexId[] => names([...list].map(id));

  it('is written, searched from R alone, and played between two of the mentor lines', () => {
    expect(level.data.draft).toBe(false);
    expect(level.start.roots).toEqual([id('R')]);
    expect(stepsOf(level)).toEqual(['say', 'play', 'say']);
  });

  it('first folds F1 = {b, c, d} with base b, at d–b', () => {
    const folded = after(level, 'foldAt');
    const [flower, ...others] = flowersOf(folded);
    expect(others).toEqual([]);
    if (flower === undefined) throw new Error('no flower folded');
    expect(baseVertex(flower)).toBe(id('b'));
    expect(names(members(flower))).toEqual(sprouts('bcd'));
  });

  it('then folds F2 = {R, a, F1, g, h} with base R, at h–R, F1 folded inside it', () => {
    const folded = after(level, 'foldAt', 2);
    const [flower, ...others] = flowersOf(folded);
    expect(others).toEqual([]);
    if (flower === undefined) throw new Error('no flower folded');
    expect(baseVertex(flower)).toBe(id('R'));
    expect(names(members(flower))).toEqual(sprouts('Rabcdgh'));
    const [inner, ...more] = innerFlowers(flower);
    expect(more).toEqual([]);
    if (inner === undefined) throw new Error('F1 is not inside F2');
    expect(names(members(inner))).toEqual(sprouts('bcd'));
  });

  it('from F2, t is a moon in the dark: the chain unfolds as t–a=b–d=c–g=h–R', () => {
    const seen = after(level, 'markMoon', 4).chainSeen;
    const path = [...'tabdcghR'].map(id);
    expect(seen === null ? null : [...seen].reverse()).toEqual(path);
    const opened = after(level, 'unfold', 2);
    expect(flowersOf(opened)).toEqual([]);
    // Inside F1, the short side b–c leaves two dark vines in a row (b–c and c–g).
    expect(applyAction(opened, { type: 'chain', path: [...'tabcghR'].map(id) }).ok).toBe(false);
    expect(size(play(opened, [{ type: 'chain', path }]).matching)).toBe(4);
  });

  it('unfolds from the outside in: F2 first, which leaves F1 still folded', () => {
    const half = after(level, 'unfold');
    const [inner, ...others] = flowersOf(half);
    expect(others).toEqual([]);
    if (inner === undefined) throw new Error('F1 did not stay folded');
    expect(names(members(inner))).toEqual(sprouts('bcd'));
  });
});
