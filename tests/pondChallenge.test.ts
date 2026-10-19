import { checkTutteBerge, tutteBergeBound } from '@core/certificates/tutteBerge';
import { isMaximum, maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { checkMirror, drawReflection, startChallenge } from '@game/systems/mirrorChallenge';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { starsCeiling } from '@levels/starsCeiling';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { matchingArb } from './support/arbitraries';

/**
 * The lessons of the mirror challenge (GDD 2.4, plan 10 phase 8) that its garden must really hold,
 * checked with the core: the player can beat the starting lanterns, and every better reflection
 * leaves a chain; once that chain is used nobody can beat the garden, although its sixteen sprouts
 * would have room for eight lanterns, so "ganarle" is impossible because no chain is left, never
 * just by counting.
 */

/** A level of the catalog, by id. */
const levelOf = (id: string): Level => {
  const found = catalog().find((candidate) => candidate.data.id === id);
  if (found === undefined) throw new Error(`no level ${id}`);
  return found;
};

const level = levelOf('2.4');

/** A sprout of 2.4, by name. */
const sprout = (name: string): VertexId => {
  const id = idOf(level.labels, name);
  if (id === undefined) throw new Error(`no sprout ${name}`);
  return id;
};

/** The garden once the reference walkthrough has played its moves: the one of the second phase. */
const played = (): GardenState =>
  level.solution.reduce((state, action) => {
    const outcome = applyAction(state, action);
    if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(outcome.reason)}`);
    return outcome.state;
  }, level.start);

describe('the mirror challenge of 2.4', () => {
  it('is a grid of four rows of four sprouts, with vines only between neighbours', () => {
    const { sprouts, vines } = level.data;
    expect(sprouts).toHaveLength(16);
    expect(new Set(sprouts.map((s) => s.x)).size).toBe(4);
    expect(new Set(sprouts.map((s) => s.y)).size).toBe(4);
    const xs = [...new Set(sprouts.map((s) => s.x))].sort((a, b) => a - b);
    const ys = [...new Set(sprouts.map((s) => s.y))].sort((a, b) => a - b);
    const cell = (name: string): [number, number] => {
      const found = sprouts.find((s) => s.label === name);
      if (found === undefined) throw new Error(`no sprout ${name}`);
      return [xs.indexOf(found.x), ys.indexOf(found.y)];
    };
    for (const [u, v] of vines) {
      const [[ux, uy], [vx, vy]] = [cell(u), cell(v)];
      expect(Math.abs(ux - vx) + Math.abs(uy - vy)).toBe(1);
    }
  });

  it('starts one chain short of the most: the first challenge can be won', () => {
    expect(isMaximum(level.graph, level.start.matching)).toBe(false);
    expect(maximumSize(level.graph)).toBe(size(level.start.matching) + 1);
  });

  it('at its best it leaves sprouts dark that counting does not explain (Tutte–Berge, stone B)', () => {
    const best = maximumSize(level.graph);
    // Sixteen sprouts have room for eight lanterns; the best lights seven and leaves two dark.
    expect(level.graph.n % 2).toBe(0);
    expect(level.graph.n - 2 * best).toBeGreaterThanOrEqual(2);
    // Without B, A and C are alone and the rest is odd: three odd groups, one stone.
    expect(tutteBergeBound(level.graph, [sprout('B')])).toBe(best);
    expect(checkTutteBerge(level.graph, played().matching, [sprout('B')]).ok).toBe(true);
  });

  it('plays a challenge to win, the chain used, then one nobody can win, then the notebook', () => {
    const steps = level.flow.map((step) => step.step);
    const draws = level.flow.filter((step) => step.step === 'draw');
    expect(draws.map((step) => step.beatable)).toEqual([true, false]);
    expect(steps.indexOf('draw')).toBeLessThan(steps.indexOf('play'));
    expect(steps.lastIndexOf('draw')).toBeGreaterThan(steps.indexOf('play'));
    expect(steps.at(-1)).toBe('notebook');
    expect(isMaximum(level.graph, played().matching)).toBe(true);
  });

  it('in the second phase, no reflection the player can draw beats the garden', () => {
    const yours = played().matching;
    fc.assert(
      fc.property(matchingArb(level.graph), (drawing) => {
        const challenge = drawReflection(startChallenge(level.graph), drawing);
        expect(checkMirror(challenge, yours, false).check.kind).toBe('notBetter');
      }),
    );
  });

  it('its play step earns no star: 2.4 gives two at most, and the flower 2.5 still asks for six', () => {
    expect(starsCeiling(level.data)).toBe(2);
    // Plan 08, section 1.1: the chapter's levels plus half its extra stars, rounded up.
    const normal = ['2.1', '2.2', '2.3', '2.4'].map((id) => starsCeiling(levelOf(id).data));
    const most = normal.reduce((sum, stars) => sum + stars, 0);
    const extra = most - normal.length;
    expect(levelOf('2.5').data.secret?.stars).toBe(normal.length + Math.ceil(extra / 2));
  });
});
