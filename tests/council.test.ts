import { nestingDepth } from '@core/blossom/hierarchy';
import { stonesFromForest } from '@core/certificates/fromForest';
import { oddComponents } from '@core/certificates/oddComponents';
import { checkTutteBerge, tutteBergeBound } from '@core/certificates/tutteBerge';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import { neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import { runRecipe } from '@core/recipe/run';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import { searchStatus } from '@core/search/searchStatus';
import { councilCount } from '@game/picture/council';
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

describe('7.4: the gift of the search II', () => {
  const level = levelOf('7.4');
  const id = (name: string): VertexId => sproutOf(level, name);
  const sorted = (list: readonly string[]): VertexId[] => list.map(id).sort((a, b) => a - b);
  const atPlay = gardenAtPlay(level);

  it('holds the garden of 4.9, and beside it one like it whose loop has five petals', () => {
    const named = (from: Level) =>
      from.graph.edges.map(([u, v]) => [from.data.sprouts[u]?.label, from.data.sprouts[v]?.label]);
    expect(named(level)).toEqual(expect.arrayContaining(named(levelOf('4.9'))));
    expect(level.graph.n).toBe(12);
    expect(maximumSize(level.graph)).toBe(size(level.start.matching));
    expect(level.start.roots).toBeNull();
  });

  it('is searched by the automaton, which folds where the light of 4.1 would not', () => {
    expect(stepsOf(level)).toEqual(['say', 'automaton', 'say', 'play', 'say']);
    expect(stepOf(level, 'automaton').missing).toBeUndefined();
    const run = runRecipe(level.start, { fold: true });
    expect(run.filter((move) => move.type === 'foldAt')).toHaveLength(2);
  });

  it('the search of the automaton ends with no chain; its moons a, a2 are a valid certificate', () => {
    const status = searchStatus(atPlay.layer, atPlay.search, { roots: null, foldAllowed: true });
    expect(status).toBe('exhausted');
    if (atPlay.search === null) throw new Error('no search');
    const moons = stonesFromForest(atPlay.layer, atPlay.search);
    expect(moons).toEqual(sorted(['a', 'a2']));
    const proof = checkTutteBerge(level.graph, atPlay.matching, moons);
    if (!proof.ok) throw new Error('the moons do not prove the lanterns');
    // Each sun or flower is left alone: R, the flower b c d, R2 and the flower of five.
    expect(proof.value.oddGroups.map((group) => group.length).sort()).toEqual([1, 1, 3, 5]);
    expect(level.graph.n - 2 * size(atPlay.matching)).toBe(2);
  });

  it('is won by lifting exactly those moons; other stones that also close do not win it', () => {
    expect(level.data.victory).toEqual({ type: 'moonCertificate' });
    expect(isVictory(solved(level), { type: 'moonCertificate' })).toBe(true);
    const alone = play(atPlay, [{ type: 'liftStone', vertex: id('a') }, { type: 'declareDone' }]);
    expect(isVictory(alone, { type: 'tutteBergeCertificate' })).toBe(true);
    expect(isVictory(alone, { type: 'moonCertificate' })).toBe(false);
  });

  it('opens the Codex entry of the stones (C12)', () => {
    expect(level.data.unlocks.codex).toEqual(['C12']);
  });
});

describe('7.5: before the Council', () => {
  const level = levelOf('7.5');
  /** Every garden of the reference solution, from the start of the play. */
  const day = level.solution.reduce<GardenState[]>(
    (states, move) => [...states, play(states.at(-1) ?? level.start, [move])],
    [gardenAtPlay(level)],
  );
  const end = solved(level);

  it('is 22 sprouts in the fog, the goal hidden, won by presenting lanterns and stones', () => {
    expect(level.graph.n).toBe(22);
    expect(level.data.fog).toBe(true);
    expect(level.data.goal.visible).toBe(false);
    expect(level.data.victory).toEqual({ type: 'tutteBergeCertificate' });
    expect(isVictory(end, { type: 'tutteBergeCertificate' })).toBe(true);
  });

  it('starts short of the most lanterns: a chain has to be lit before the proof can close', () => {
    expect(size(level.start.matching)).toBeLessThan(maximumSize(level.graph));
    expect(size(end.matching)).toBe(maximumSize(level.graph));
  });

  it('its flowers nest: on the way a flower is folded inside another', () => {
    const deepest = Math.max(
      ...day.flatMap((state) =>
        [...Array(state.graph.n).keys()].map((v) => nestingDepth(state.layer, v)),
      ),
    );
    expect(deepest).toBe(2);
  });

  it('the stones presented are the moons of its last search, over without a chain', () => {
    const status = searchStatus(end.layer, end.search, { roots: null, foldAllowed: true });
    expect(status).toBe('exhausted');
    if (end.search === null) throw new Error('no search');
    expect([...end.stones].sort((a, b) => a - b)).toEqual(stonesFromForest(end.layer, end.search));
  });

  it("in the fog, the Council's count only shows once the proof is presented", () => {
    const beforeClaim = day.at(-2);
    if (beforeClaim === undefined) throw new Error('no garden before "Terminé"');
    expect(councilCount(level, beforeClaim)).toEqual({ key: 'hud.councilHidden', params: {} });
    expect(councilCount(level, end)?.key).toBe('hud.council');
  });
});
