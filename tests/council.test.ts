import { oddComponents } from '@core/certificates/oddComponents';
import { checkTutteBerge, tutteBergeBound } from '@core/certificates/tutteBerge';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import { neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { counterexampleAt } from '@levels/counterexample';
import type { LevelStep } from '@levels/flow';
import { gardenAtPlay } from '@levels/playStart';
import { isUiUnlocked } from '@levels/uiUnlocks';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the Council of the Oaks (GDD §7, chapter 7) that its gardens must really hold,
 * checked with the core: the greenhouse proof does not close where loops are odd; an odd group
 * always leaves someone in the dark; with k stones and g odd groups at least g − k sleep in the
 * dark; and the search that fails hands the stones over.
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

/** The garden once the reference solution is played where the play step starts. */
const solved = (level: Level): GardenState => play(gardenAtPlay(level), level.solution);

/** The kinds of steps of a level's script, in order. */
const stepsOf = (level: Level): string[] => level.flow.map((step) => step.step);

/** The step of a kind in a level's script; the test fails if there is none. */
const stepOf = <K extends LevelStep['step']>(
  level: Level,
  kind: K,
): Extract<LevelStep, { step: K }> => {
  const found = level.flow.find(
    (step): step is Extract<LevelStep, { step: K }> => step.step === kind,
  );
  if (found === undefined) throw new Error(`no ${kind} step in ${level.data.id}`);
  return found;
};

describe('7.1: the scarecrows are not enough', () => {
  const level = levelOf('7.1');

  it('is a loop of five with its two lanterns, the most it holds, the goal hidden', () => {
    expect(level.graph.n).toBe(5);
    expect(level.graph.edges).toHaveLength(5);
    expect(size(level.start.matching)).toBe(2);
    expect(maximumSize(level.graph)).toBe(2);
    expect(level.data.goal.visible).toBe(false);
  });

  it('no two scarecrows guard every vine: the proof of the greenhouse cannot close here', () => {
    for (let u = 0; u < 5; u++) {
      for (let v = u + 1; v < 5; v++) {
        expect(checkVertexCover(level.graph, [u, v]).ok).toBe(false);
      }
    }
  });

  it('is won by guarding every vine with three scarecrows, though only two lanterns are lit', () => {
    const end = solved(level);
    expect(end.scarecrows).toHaveLength(3);
    expect(size(end.matching)).toBe(2);
    expect(level.data.victory).toEqual({ type: 'coverComplete' });
    expect(isVictory(end, { type: 'coverComplete' })).toBe(true);
    expect(isVictory(end, { type: 'coverCertificate' })).toBe(false);
  });

  it('then asks whether the proof closed: only "it does not" is right, asked again if wrong', () => {
    expect(stepsOf(level)).toEqual(['say', 'play', 'ask', 'say']);
    const ask = stepOf(level, 'ask');
    expect(ask.retry).toBe(true);
    expect(ask.options.map((option) => option.correct)).toEqual([true, false, false]);
  });
});

describe('7.2: stones', () => {
  const level = levelOf('7.2');
  const first = levelOf('7.1');

  it('is the loop of five of 7.1, with the same two lanterns', () => {
    expect(level.data.sprouts).toEqual(first.data.sprouts);
    expect(level.graph).toEqual(first.graph);
    expect(level.start.matching).toEqual(first.start.matching);
  });

  it('with no stone lifted, the loop is one odd group: someone sleeps in the dark, so two at most', () => {
    const proof = checkTutteBerge(level.graph, level.start.matching, []);
    expect(proof).toEqual({ ok: true, value: { bound: 2, oddGroups: [[0, 1, 2, 3, 4]] } });
  });

  it('the Oaks ask why not three; the right answer is that five do not pair up', () => {
    expect(stepsOf(level)).toEqual(['ask', 'say', 'play', 'say']);
    const ask = stepOf(level, 'ask');
    expect(ask.prompt).toMatch(/\.oaks\./);
    expect(ask.retry).toBe(true);
    expect(ask.options.map((option) => option.correct)).toEqual([true, false, false]);
    expect(ask.options[0]?.line).toMatch(/\.gardener\./);
  });

  it('is won by presenting the count with "Terminé", no stone lifted, and opens the stones', () => {
    expect(level.solution.filter((move) => move.type === 'liftStone')).toEqual([]);
    const end = solved(level);
    expect(end.stones).toEqual([]);
    expect(isVictory(end, { type: 'tutteBergeCertificate' })).toBe(true);
    expect(level.data.unlocks.actions).toEqual(['liftStone', 'dropStone']);
    expect(isUiUnlocked('council', level.data.id)).toBe(true);
    expect(isUiUnlocked('council', first.data.id)).toBe(false);
  });
});

describe('7.3: choose your stones', () => {
  const level = levelOf('7.3');
  const id = (name: string): VertexId => sproutOf(level, name);

  it('is the helix: a centre C joined to one sprout of each of three triangles, four lanterns', () => {
    expect(level.graph.n).toBe(10);
    expect(neighbors(level.graph, id('C'))).toHaveLength(3);
    expect(maximumSize(level.graph)).toBe(4);
    expect(size(level.start.matching)).toBe(4);
    expect(level.data.goal.visible).toBe(false);
  });

  it('with no stone lifted, the garden is one even group of ten and proves nothing', () => {
    expect(oddComponents(level.graph, [])).toEqual([]);
    expect(checkTutteBerge(level.graph, level.start.matching, []).ok).toBe(false);
  });

  it('lifting C leaves three triangles, three odd groups: 3 − 1 = 2 in the dark, and there are 2', () => {
    expect(oddComponents(level.graph, [id('C')])).toHaveLength(3);
    expect(level.graph.n - 2 * tutteBergeBound(level.graph, [id('C')])).toBe(2);
    expect(level.graph.n - 2 * size(level.start.matching)).toBe(2);
    expect(isVictory(solved(level), { type: 'tutteBergeCertificate' })).toBe(true);
    expect(solved(level).stones).toEqual([id('C')]);
  });

  it('the stones must be chosen well: no other single stone closes the count', () => {
    for (let vertex = 0; vertex < level.graph.n; vertex++) {
      if (vertex === id('C')) continue;
      expect(checkTutteBerge(level.graph, level.start.matching, [vertex]).ok).toBe(false);
    }
  });

  it('then writes it in the notebook, after the mentor names it, the true statement first', () => {
    expect(stepsOf(level)).toEqual(['say', 'play', 'say', 'notebook']);
    const options = level.data.notebook?.options ?? [];
    expect(options.map((option) => option.correct)).toEqual([true, false, false]);
    expect(options.map((option) => option.counterexample?.mode)).toEqual([
      undefined,
      'play',
      'play',
    ]);
  });

  it('"exactly g in the dark" fails: lifting the middle of a row of three, only one is dark', () => {
    const refuted = counterexampleAt(level, 1);
    if (refuted === null) throw new Error('no counterexample');
    const middle = idOf(refuted.labels, 'B');
    if (middle === undefined) throw new Error('no sprout B');
    const lifted = play(refuted.start, [{ type: 'liftStone', vertex: middle }]);
    expect(oddComponents(lifted.graph, lifted.stones)).toHaveLength(2);
    expect(lifted.graph.n - 2 * size(lifted.matching)).toBe(1);
  });

  it('"even groups leave someone in the dark too" fails: the square lights everyone', () => {
    const refuted = counterexampleAt(level, 2);
    if (refuted === null) throw new Error('no counterexample');
    expect(oddComponents(refuted.start.graph, [])).toEqual([]);
    expect(2 * maximumSize(refuted.start.graph)).toBe(refuted.start.graph.n);
  });
});
