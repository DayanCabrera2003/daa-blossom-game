import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { foundChain, gapOpen, gapSprouts } from './liftGaps';

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The day of a level's reference solution: its first state, then one after each move. */
function solutionDay(level: Level): GardenState[] {
  const day = [level.start];
  for (const action of level.solution) {
    const outcome = applyAction(day[day.length - 1] as GardenState, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    day.push(outcome.state);
  }
  return day;
}

/** The names of some sprouts of a level. */
const names = (level: Level, vertices: readonly number[]): string =>
  vertices.map((v) => level.data.sprouts[v]?.label ?? '?').join('');

/** The day up to the last move before the chain is lit (the chain seen, the flowers open). */
const beforeLighting = (level: Level): GardenState[] => solutionDay(level).slice(0, -1);

/** The found chain at the end of `day`, its gaps by the sprouts' names, and whether each is open. */
function found(level: Level, day: readonly GardenState[]) {
  const cursor = day.length - 1;
  const seen = foundChain(day, cursor);
  if (seen === null) return null;
  return {
    chain: names(level, seen.chain),
    gaps: seen.gaps.map((gap) => names(level, gapSprouts(seen.chain, gap))),
    open: seen.gaps.map((gap) => gapOpen(day[cursor] as GardenState, seen.chain, gap)),
  };
}

/** A chain read either way round, so a test does not depend on the end the light reached first. */
const eitherWay = (text: string): string[] => [text, [...text].reverse().join('')];

describe('the gaps of the chain the light found (plan 10, phase 2)', () => {
  it('in 4.5, once the flower is open, the found stretches are R–a=b and c–e and the gap is b…c', () => {
    const level = levelById('4.5');
    const result = found(level, beforeLighting(level));
    expect(eitherWay('Rabdce')).toContain(result?.chain);
    expect(eitherWay(result?.gaps[0] ?? '')).toContain('bdc');
    expect(result?.gaps).toHaveLength(1);
    expect(result?.open).toEqual([true]);
  });

  it('in 4.5, while the flower is still folded, the same gap is there but closed', () => {
    const level = levelById('4.5');
    // The light has just found the chain; the flower b, c, d is still folded.
    const day = solutionDay(level).slice(0, 6);
    const result = found(level, day);
    expect(result?.gaps).toHaveLength(1);
    expect(result?.open).toEqual([false]);
  });

  it('in 5.1, with both flowers open, there is one gap holding the inner flower too', () => {
    const level = levelById('5.1');
    const day = beforeLighting(level);
    const result = found(level, day);
    expect(eitherWay('Rhgcdbat')).toContain(result?.chain);
    // The outer flower folds every sprout but t: the whole chain from R to a is its one gap.
    expect(result?.gaps.map((gap) => [...gap].sort().join(''))).toEqual(['Rabcdgh']);
    expect(result?.open).toEqual([true]);
    // With the outer flower open and the inner one still folded, the gap cannot be dragged yet.
    const outerOnly = day.slice(0, -1);
    expect(found(level, outerOnly)?.open).toEqual([false]);
  });

  it('in 4.8 the flower the chain does not cross opens no gap', () => {
    const level = levelById('4.8');
    const result = found(level, beforeLighting(level));
    expect(result?.gaps.map((gap) => [...gap].sort().join(''))).toEqual(['hij']);
  });

  it('undone to before the chain was found, or once it is lit, there are no stretches', () => {
    const level = levelById('4.5');
    const day = solutionDay(level);
    expect(foundChain(day, 4)).toBeNull();
    expect(foundChain(day, day.length - 1)).toBeNull();
  });

  it('where any chain may be lit, a chain seen draws no stretches (chapter 3)', () => {
    const level = levelById('3.1');
    const day = solutionDay(level).slice(0, -1);
    expect(day[day.length - 1]?.chainSeen).not.toBeNull();
    expect(foundChain(day, day.length - 1)).toBeNull();
  });
});
