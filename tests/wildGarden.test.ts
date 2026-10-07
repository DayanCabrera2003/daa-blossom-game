import { baseVertex, members, nestingDepth, nodesWithin } from '@core/blossom/hierarchy';
import type { Blossom, GardenNode } from '@core/blossom/types';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import { AUTOMATON_MOVES, runRecipe } from '@core/recipe/run';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { buildCounterexample } from '@levels/counterexample';
import { isUiUnlocked } from '@levels/uiUnlocks';
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

/** How many flowers deep a flower goes: 1 for a flower of sprouts only. */
const foldDepth = (flower: Blossom): number =>
  1 + Math.max(0, ...innerFlowers(flower).map((inner) => foldDepth(inner)));

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

  it('is the garden where a recipe without folding falls short (6.3): 3 lanterns, then 4', () => {
    // The recipe starts from every dark sprout, R and t, whatever the level's own roots.
    const start = { ...level.start, roots: null, allowed: new Set(AUTOMATON_MOVES) };
    const broken = play(start, runRecipe(start, { fold: false }));
    expect([size(broken.matching), broken.declaredDone]).toEqual([3, true]);
    const repaired = play(start, runRecipe(start, { fold: true }));
    expect([size(repaired.matching), repaired.declaredDone]).toEqual([
      maximumSize(level.graph),
      true,
    ]);
  });
});

describe('5.2: layers', () => {
  const level = levelOf('5.2');
  const id = (name: string): VertexId => sproutOf(level, name);
  const sorted = (list: string): VertexId[] => [...list].map(id).sort((a, b) => a - b);
  const membersOf = (node: GardenNode | undefined): VertexId[] =>
    node === undefined ? [] : members(node).sort((a, b) => a - b);

  it('is searched from R alone and opens the layers, whose card shows as it starts', () => {
    expect(level.data.draft).toBe(false);
    expect(level.start.roots).toEqual([id('R')]);
    expect(stepsOf(level)).toEqual(['say', 'play', 'say']);
    expect(isUiUnlocked('layers', level.data.id)).toBe(true);
    expect(isUiUnlocked('layers', levelOf('5.1').data.id)).toBe(false);
  });

  it('folds three flowers, each inside the next, and the chain leaves from the outermost', () => {
    const folded = after(level, 'foldAt', 3);
    const [outer, ...others] = flowersOf(folded);
    expect(others).toEqual([]);
    if (outer === undefined) throw new Error('no flower folded');
    expect(baseVertex(outer)).toBe(id('R'));
    // The innermost triangle sits three layers deep.
    expect(nestingDepth(folded.layer, id('e'))).toBe(3);
    const middle = innerFlowers(outer)[0];
    const inner = middle === undefined ? undefined : innerFlowers(middle)[0];
    expect(membersOf(outer)).toEqual(sorted('Rabcdefghij'));
    expect(membersOf(middle)).toEqual(sorted('bcdefgh'));
    expect(membersOf(inner)).toEqual(sorted('def'));
    expect(after(level, 'markMoon', 6).chainSeen).not.toBeNull();
  });

  it('the layers enter one flower at a time, and each shows the next one still folded', () => {
    const folded = after(level, 'foldAt', 3);
    const flowerIds = (nodes: readonly GardenNode[] | null): number[] =>
      (nodes ?? []).flatMap((node) => (node.kind === 'blossom' ? [node.id] : []));
    const [outer] = flowerIds(folded.layer.nodes);
    if (outer === undefined) throw new Error('no flower folded');
    const [middle] = flowerIds(nodesWithin(folded.layer, [outer]));
    if (middle === undefined) throw new Error('no flower inside the outer one');
    const [inner] = flowerIds(nodesWithin(folded.layer, [outer, middle]));
    if (inner === undefined) throw new Error('no flower inside the middle one');
    const petals = nodesWithin(folded.layer, [outer, middle, inner]) ?? [];
    expect(petals.map((node) => membersOf(node))).toEqual(
      expect.arrayContaining([[id('d')], [id('e')], [id('f')]]),
    );
    expect(petals).toHaveLength(3);
  });

  it('unfolds from the outside in, and the chain crosses all three: 6 lanterns', () => {
    const opened = after(level, 'unfold', 3);
    expect(flowersOf(opened)).toEqual([]);
    const lit = play(opened, level.solution.slice(level.solution.length - 1));
    expect(size(lit.matching)).toBe(6);
    expect(level.solution.at(-1)).toEqual({ type: 'chain', path: [...'tabcdfeghijR'].map(id) });
  });
});

describe('5.3: the wrong petal', () => {
  const level = levelOf('5.3');
  const id = (name: string): VertexId => sproutOf(level, name);
  const sorted = (list: string): VertexId[] => [...list].map(id).sort((a, b) => a - b);
  const chainAt = level.solution.findIndex((move) => move.type === 'chain');
  const chain = level.solution[chainAt];
  const path = chain?.type === 'chain' ? chain.path : [];

  it('is searched from R alone and ends in the notebook', () => {
    expect(level.data.draft).toBe(false);
    expect(level.start.roots).toEqual([id('R')]);
    expect(stepsOf(level)).toEqual(['say', 'play', 'say', 'notebook']);
  });

  it('folds the five petals around b, then the loop through them around R', () => {
    const inner = flowersOf(after(level, 'foldAt'))[0];
    if (inner === undefined) throw new Error('no flower folded');
    expect(baseVertex(inner)).toBe(id('b'));
    expect(members(inner).sort((a, b) => a - b)).toEqual(sorted('bcdef'));
    const outer = flowersOf(after(level, 'foldAt', 2))[0];
    if (outer === undefined) throw new Error('no flower folded');
    expect(baseVertex(outer)).toBe(id('R'));
    expect(innerFlowers(outer).map((flower) => baseVertex(flower))).toEqual([id('b')]);
  });

  it('the chain from t comes into the inner flower by f, a petal that is not its base', () => {
    expect(path[0]).toBe(id('t'));
    const petals = new Set(sorted('bcdef'));
    const inside = path.flatMap((vertex, at) => (petals.has(vertex) ? [at] : []));
    const entry = path[inside[0] ?? -1];
    const exit = path[inside.at(-1) ?? -1];
    expect(entry).toBe(id('f'));
    expect(entry).not.toBe(id('b'));
    // It leaves by the base b, along the lantern a=b: the only lantern out of the flower.
    expect(exit).toBe(id('b'));
    // In between it goes round the long side, all five petals one after the other.
    expect(inside).toHaveLength(5);
    expect((inside.at(-1) ?? 0) - (inside[0] ?? 0)).toBe(4);
  });

  it('inside, only the long side alternates: the short one f–b is refused', () => {
    const opened = after(level, 'unfold', 2);
    expect(flowersOf(opened)).toEqual([]);
    const short = [...'thgfbaR'].map(id);
    expect(applyAction(opened, { type: 'chain', path: short })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath' },
    });
    expect(size(play(opened, [{ type: 'chain', path }]).matching)).toBe(5);
  });

  it('(b): in the garden of 5.1 the chain from t leaves the inner flower by c, not by its base', () => {
    const data = level.data.notebook?.options[1]?.counterexample;
    if (data === undefined) throw new Error('statement (b) has no counterexample');
    const built = buildCounterexample(data);
    if (!built.ok) throw new Error('the counterexample does not build');
    const { start, labels } = built.value;
    const sprout = (name: string): VertexId => {
      const vertex = idOf(labels, name);
      if (vertex === undefined) throw new Error(`no sprout ${name}`);
      return vertex;
    };
    const folded = play(start, [
      { type: 'markRoot', vertex: sprout('R') },
      { type: 'markMoon', from: sprout('R'), to: sprout('a') },
      { type: 'markMoon', from: sprout('b'), to: sprout('c') },
      { type: 'foldAt', from: sprout('d'), to: sprout('b') },
    ]);
    const inner = flowersOf(folded)[0];
    if (inner === undefined) throw new Error('no flower folded');
    expect(baseVertex(inner)).toBe(sprout('b'));
    const chain = [...'tabdcghR'].map(sprout);
    // From t, the chain comes in by the base b and goes out by c, towards g.
    expect(chain.indexOf(sprout('c')) + 1).toBe(chain.indexOf(sprout('g')));
    expect(size(play(start, [{ type: 'chain', path: chain }]).matching)).toBe(4);
  });
});

/** The reference solution cut into rounds, each ending with the chain it lights. */
const roundsOf = (level: Level): Action[][] => {
  const rounds: Action[][] = [[]];
  for (const move of level.solution) {
    rounds.at(-1)?.push(move);
    if (move.type === 'chain') rounds.push([]);
  }
  return rounds.filter((round) => round.some((move) => move.type === 'chain'));
};

/**
 * The flower each round of the reference solution has folded around the rest when its last fold is
 * made: the outermost flower at that moment, or null for a round that folds nothing.
 */
const lastFolds = (level: Level): (Blossom | null)[] => {
  let state = level.start;
  return roundsOf(level).map((round) => {
    let flower: Blossom | null = null;
    for (const move of round) {
      state = play(state, [move]);
      if (move.type !== 'foldAt') continue;
      const id = itemAt(state.layer.nodeOf, move.from);
      const node = itemAt(state.layer.nodes, id);
      flower = node.kind === 'blossom' ? node : null;
    }
    return flower;
  });
};

describe('5.4: wild garden', () => {
  const level = levelOf('5.4');
  const id = (name: string): VertexId => sproutOf(level, name);

  it('16 sprouts, the goal hidden: the most lanterns, said with "Terminé"', () => {
    expect(level.graph.n).toBe(16);
    expect(level.data.goal.visible).toBe(false);
    expect(level.data.victory).toEqual({ type: 'maximum' });
  });

  it('three rounds of chains are needed, and the reference plays exactly three', () => {
    expect(maximumSize(level.graph) - size(level.start.matching)).toBe(3);
    expect(roundsOf(level)).toHaveLength(3);
  });

  it('two of the rounds fold a flower inside another, each nesting in its own way', () => {
    const [first, second] = lastFolds(level);
    if (first == null || second == null) throw new Error('a round folds nothing');
    const [firstInner] = innerFlowers(first);
    const [secondInner] = innerFlowers(second);
    if (firstInner === undefined || secondInner === undefined) throw new Error('no nesting');
    // From R, the inner flower hangs inside the loop, with a base of its own (as in 5.1).
    expect(baseVertex(first)).toBe(id('R'));
    expect(baseVertex(firstInner)).not.toBe(baseVertex(first));
    // From U, the inner flower holds the base of the outer one: both open at U.
    expect(baseVertex(second)).toBe(id('U'));
    expect(baseVertex(secondInner)).toBe(id('U'));
  });
});

describe('5.5: mastery of the wild garden', () => {
  const level = levelOf('5.5');

  it('20 sprouts in the fog, with water to count and lanterns already lit', () => {
    expect(level.graph.n).toBe(20);
    expect(level.data.fog).toBe(true);
    expect(level.data.water).not.toBeNull();
    expect(size(level.start.matching)).toBeGreaterThan(0);
    expect(level.data.goal.visible).toBe(false);
  });

  it('the reference reaches the most lanterns within the water, and says so', () => {
    const end = play(level.start, level.solution);
    expect(isVictory(end, { type: 'maximum' })).toBe(true);
    expect(end.waterUsed).toBeLessThanOrEqual(level.data.water ?? -1);
  });

  it('on the way, one round folds three flowers one inside another', () => {
    expect(lastFolds(level).some((flower) => flower !== null && foldDepth(flower) === 3)).toBe(
      true,
    );
  });

  it('opens the Codex on nested flowers', () => {
    expect(level.data.unlocks.codex).toEqual(['C9']);
  });
});
