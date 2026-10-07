import { openSession, respond } from '@game/systems/levelSession';
import { playWalkthrough } from '@game/systems/walkthrough';
import { isExposed, size } from '@core/matching/queries';
import { applyAction } from '@core/rules/applyAction';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { buildCounterexample, type Counterexample } from '@levels/counterexample';
import { describe, expect, it } from 'vitest';

/**
 * The notebook of 1.5 (GDD §7, 1.5): "a chain that starts and ends at sprouts in the dark…" (a)
 * "…lights exactly one new lantern" is true; (b) "…lights as many lanterns as sprouts it touches"
 * and (c) "…only works if it is short" are refuted by gardens the player can touch. What the
 * gardens show is checked here with the core, never with the view.
 */

const level15 = (): Level => {
  const level = catalog().find((candidate) => candidate.data.id === '1.5');
  if (level === undefined) throw new Error('no level 1.5');
  return level;
};

/** The counterexample of statement `option` of 1.5, built. */
const counterexampleOf = (option: number): Counterexample => {
  const data = level15().data.notebook?.options[option]?.counterexample;
  if (data === undefined) throw new Error(`statement ${option} of 1.5 has no counterexample`);
  const built = buildCounterexample(data);
  if (!built.ok) throw new Error(`the counterexample of statement ${option} does not build`);
  return built.value;
};

/** The chain through every sprout of a row, in order, applied to the row as it opens. */
const chainThroughRow = (counterexample: Counterexample) => {
  const { start } = counterexample;
  const path = Array.from({ length: start.graph.n }, (_, k) => k);
  return { path, outcome: applyAction(start, { type: 'chain', path }) };
};

describe('the notebook of 1.5', () => {
  it('asks after the garden is lit, and only statement (a) is true', () => {
    const { flow, data } = level15();
    expect(flow.map((step) => step.step)).toEqual(['play', 'say', 'notebook']);
    expect(data.notebook?.options.map((option) => option.correct)).toEqual([true, false, false]);
  });

  it('(b): a chain through 6 sprouts, from the dark to the dark, lights exactly one lantern', () => {
    const counterexample = counterexampleOf(1);
    expect(counterexample.mode).toBe('play');
    const { path, outcome } = chainThroughRow(counterexample);
    expect(path).toHaveLength(6);
    const { matching } = counterexample.start;
    expect(isExposed(matching, itemAt(path, 0))).toBe(true);
    expect(isExposed(matching, itemAt(path, 5))).toBe(true);
    if (!outcome.ok) throw new Error(`the chain is refused: ${JSON.stringify(outcome.reason)}`);
    expect(size(outcome.state.matching) - size(matching)).toBe(1);
  });

  it('(c): a chain through 10 sprouts works as well as a short one: one lantern more', () => {
    const counterexample = counterexampleOf(2);
    const { path, outcome } = chainThroughRow(counterexample);
    expect(path).toHaveLength(10);
    if (!outcome.ok) throw new Error(`the chain is refused: ${JSON.stringify(outcome.reason)}`);
    expect(size(outcome.state.matching) - size(counterexample.start.matching)).toBe(1);
  });

  it('a false statement never finishes the level; the true one does, and is written down', () => {
    const level = level15();
    const played = playWalkthrough({ ...level, walkthrough: level.walkthrough.slice(0, -1) });
    let session = played.controller.session;
    expect(played.problem).toEqual({ code: 'unfinished', step: 2 });
    for (const option of [1, 2, 1]) {
      const wrong = respond(session, { type: 'answer', option }, 0);
      expect(wrong.effects.map((effect) => effect.kind)).toEqual([
        'answered',
        'counterexample',
        'notebook',
      ]);
      expect(wrong.session.won).toBeNull();
      session = wrong.session;
    }
    const right = respond(session, { type: 'answer', option: 0 }, 0);
    expect(right.effects.map((effect) => effect.kind)).toEqual([
      'answered',
      'say',
      'written',
      'finished',
    ]);
    expect(right.session.won).not.toBeNull();
  });

  it('the notebook opens only once the garden is lit, never at the start', () => {
    expect(openSession(level15(), 0).effects).toEqual([{ kind: 'play' }]);
  });
});
