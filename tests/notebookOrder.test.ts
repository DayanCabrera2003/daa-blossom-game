import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { isExposed, size } from '@core/matching/queries';
import { applyAction } from '@core/rules/applyAction';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { counterexampleAt, type Counterexample } from '@levels/counterexample';
import { stepLines } from '@levels/lines';
import { describe, expect, it } from 'vitest';

/**
 * The notebooks that ask before the mentor sums up (GDD §5.5, plan 10, phase 6): in 4.7, 4.10, 4.11
 * and 5.3 the line that used to close the level before the notebook is now the mentor's reply to
 * the right statement, and is never said before it. What the new false statements claim is checked
 * with the core.
 */

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The built counterexample of statement `option` of the first question of level `id`. */
const counterexampleOf = (id: string, option: number): Counterexample => {
  const counterexample = counterexampleAt(levelOf(id), 0, option);
  if (counterexample === null) throw new Error(`statement ${option} of ${id} has no garden`);
  return counterexample;
};

/** A sprout of a counterexample, by name. */
const sproutOf = (counterexample: Counterexample, name: string): VertexId => {
  const vertex = idOf(counterexample.labels, name);
  if (vertex === undefined) throw new Error(`no sprout ${name}`);
  return vertex;
};

describe('the mentor sums up after the notebook, as the reply to the right statement', () => {
  it.each([
    ['4.7', 'ch4.7.sauce.04'],
    ['4.10', 'ch4.10.sauce.05'],
    ['4.11', 'ch4.11.sauce.06'],
    ['5.3', 'ch5.3.sauce.04'],
  ])('%s: the summary %s answers the right statement and is not said before', (id, summary) => {
    const { data } = levelOf(id);
    const at = data.flow.findIndex((step) => step.step === 'notebook');
    const right = data.notebook?.[0]?.options.find((option) => option.correct);
    expect(right?.reply).toBe(summary);
    expect(data.flow.slice(0, at).flatMap(stepLines)).not.toContain(summary);
  });
});

describe('the new false statements are false in their gardens', () => {
  it('4.10 (d): turning the stem to the base keeps the lanterns, and the base ends in the dark', () => {
    const counterexample = counterexampleOf('4.10', 3);
    const { start } = counterexample;
    const stem = ['R', 'a', 'b', 'c', 'd'].map((name) => sproutOf(counterexample, name));
    const turned = applyAction(start, { type: 'rotateStem', stem });
    if (!turned.ok) throw new Error(`the stem is refused: ${JSON.stringify(turned.reason)}`);
    expect(size(turned.state.matching)).toBe(size(start.matching));
    expect(isExposed(turned.state.matching, sproutOf(counterexample, 'd'))).toBe(true);
  });
});
