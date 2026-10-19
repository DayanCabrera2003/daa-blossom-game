import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { gardenAtPlay } from '@levels/playStart';
import { describe, expect, it } from 'vitest';
import { measure, raiseRecord, surpasses, type ProgressRecord } from './progress';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The gardens each move leaves, from `from`; a refused move is a broken test. */
function gardensAfter(from: GardenState, moves: readonly Action[]): GardenState[] {
  const gardens: GardenState[] = [];
  let state = from;
  for (const move of moves) {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(move)} (${outcome.reason.code})`);
    state = outcome.state;
    gardens.push(state);
  }
  return gardens;
}

/** For each garden in turn, whether it beats the record so far; the record rises with each. */
function beats(from: GardenState, gardens: readonly GardenState[]): boolean[] {
  let record: ProgressRecord = measure(from);
  return gardens.map((garden) => {
    const better = surpasses(record, garden);
    record = raiseRecord(record, garden);
    return better;
  });
}

describe('the progress record of a level (plan 10, phase 5)', () => {
  it('a new lantern beats the record; joining and splitting in a loop beat nothing', () => {
    const level = levelById('1.3');
    const start = gardenAtPlay(level);
    // C=D out, D–T in, D–T out, C=D back: three lanterns at most, the start's own.
    const gardens = gardensAfter(start, [
      { type: 'split', u: 3, v: 4 },
      { type: 'join', u: 4, v: 5 },
      { type: 'split', u: 4, v: 5 },
      { type: 'join', u: 3, v: 4 },
    ]);
    expect(beats(start, gardens)).toEqual([false, false, false, false]);
    const chain: Action = { type: 'chain', path: [0, 1, 2, 3, 4, 5] };
    expect(beats(start, gardensAfter(start, [chain]))).toEqual([true]);
  });

  it('with the same lanterns, more marks beat the record, also the light’s own marks', () => {
    const level = levelById('4.4');
    const start = gardenAtPlay(level);
    const light: Action = { type: 'stepLight' };
    expect(beats(start, gardensAfter(start, [light, light, light]))).toEqual([true, true, true]);
  });

  it('folding where the light stops and seeing the chain beat the record', () => {
    const level = levelById('4.4');
    const start = gardenAtPlay(level);
    expect(beats(start, gardensAfter(start, level.solution)).slice(3)).toEqual([true, true]);
  });

  it('marking again what was marked and undone beats nothing', () => {
    const level = levelById('4.4');
    const start = gardenAtPlay(level);
    const [first, second] = gardensAfter(start, [{ type: 'stepLight' }, { type: 'stepLight' }]);
    if (first === undefined || second === undefined) throw new Error('two marks');
    // Two marks, then back to one (undo), then the second again: the record is two marks already.
    let record = raiseRecord(raiseRecord(measure(start), first), second);
    expect(surpasses(record, first)).toBe(false);
    record = raiseRecord(record, first);
    expect(surpasses(record, second)).toBe(false);
  });

  it('going back to fewer lanterns than the record beats nothing', () => {
    const level = levelById('1.3');
    const start = gardenAtPlay(level);
    const lit = gardensAfter(start, [{ type: 'chain', path: [0, 1, 2, 3, 4, 5] }]);
    expect(surpasses(lit.reduce(raiseRecord, measure(start)), start)).toBe(false);
  });

  it('inspecting a sprout of the fog, guarding more vines and closing the Council’s gap beat it', () => {
    const fog = levelById('3.1');
    const fogStart = gardenAtPlay(fog);
    expect(beats(fogStart, gardensAfter(fogStart, [{ type: 'inspect', vertex: 0 }]))).toEqual([
      true,
    ]);
    const scarecrows = levelById('3.7');
    const field = gardenAtPlay(scarecrows);
    const placed = gardensAfter(field, [
      { type: 'placeScarecrow', vertex: 1 },
      { type: 'removeScarecrow', vertex: 1 },
      { type: 'placeScarecrow', vertex: 1 },
      { type: 'placeScarecrow', vertex: 3 },
    ]);
    expect(beats(field, placed)).toEqual([true, false, false, true]);
    const council = levelById('7.3');
    const helix = gardenAtPlay(council);
    const centre = council.labels.ids.get('C');
    if (centre === undefined) throw new Error('7.3 has a centre C');
    const lifted = gardensAfter(helix, [{ type: 'liftStone', vertex: centre }]);
    expect(beats(helix, lifted)).toEqual([true]);
  });
});
