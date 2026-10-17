import { checkVertexCover } from '@core/certificates/vertexCover';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import type { LevelStep } from '@levels/flow';
import { gardenAtPlay } from '@levels/playStart';
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
