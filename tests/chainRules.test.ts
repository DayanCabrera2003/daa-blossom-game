import { isExposed } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { explore } from './support/gardenExplorer';

// Each flower level asks for the gesture it teaches, and that is proved over every garden the level
// lets the player reach, not only by its reference solution (plan 10, section 2.3): without the
// gesture the victory is out of reach; with it, the reference solution wins.

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The garden the reference solution leaves, every move accepted. */
const solved = (level: Level): GardenState =>
  level.solution.reduce((state, action) => {
    const outcome = applyAction(state, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, level.start);

/** Whether the level's victory holds, "Terminé" taken as said. */
const wins = (level: Level) => (state: GardenState) => {
  const { victory } = level.data;
  if (victory === undefined) throw new Error(`level ${level.data.id} has no victory`);
  return isVictory({ ...state, declaredDone: true }, victory);
};

/** Whether the solution makes a move of one of the given kinds. */
const uses = (level: Level, types: readonly Action['type'][]): boolean =>
  level.solution.some((action) => types.includes(action.type));

describe('4.9: fold and still say "Terminé"', () => {
  const level = levelById('4.9');

  it('keeps every move that changes the lanterns closed: they are already the most', () => {
    for (const type of ['join', 'split', 'passLantern', 'chain'] as const) {
      expect(level.start.closed.has(type)).toBe(true);
    }
  });

  it('without folding, no order of moves brings the search to its end', () => {
    const walk = explore(level.start, { without: ['fold', 'foldAt'], goal: wins(level) });
    expect(walk).toMatchObject({ reached: false, witness: null });
  });

  it('with the fold of its solution, it is won', () => {
    expect(uses(level, ['foldAt'])).toBe(true);
    expect(wins(level)(solved(level))).toBe(true);
  });
});

describe('4.10: rotate the stem, the flower closed for the day', () => {
  const level = levelById('4.10');
  const base = 2;

  it('closes the flower b, c, d, with its base b', () => {
    expect(level.start.chains).toEqual({ rule: 'fromBase', base, petals: [2, 3, 4] });
  });

  it('while b keeps its lantern, no order of moves lights the third lantern', () => {
    // The gesture is leaving the base in the dark with the same lanterns: rotating the stem, or
    // passing the lantern from R to a, its shortest form. The walk never goes past a garden with b
    // in the dark, so every move it tries keeps b lit.
    const walk = explore(level.start, {
      prune: (state) => isExposed(state.matching, base),
      goal: wins(level),
    });
    expect(walk).toMatchObject({ reached: false, witness: null });
  });

  it('folding is closed for the day, not "not learnt yet" as in 3.1', () => {
    expect(applyAction(level.start, { type: 'foldAt', from: 2, to: 4 })).toEqual({
      ok: false,
      reason: { code: 'actionClosed', action: 'foldAt' },
    });
    expect(applyAction(levelById('3.1').start, { type: 'foldAt', from: 0, to: 1 })).toEqual({
      ok: false,
      reason: { code: 'actionLocked', action: 'foldAt' },
    });
  });

  it('refuses the chain of 4.1 drawn by heart, as the flower is closed', () => {
    expect(applyAction(level.start, { type: 'chain', path: [0, 1, 2, 4, 3, 5] })).toEqual({
      ok: false,
      reason: { code: 'flowerClosed' },
    });
  });

  it('once b is in the dark, the chain from the base wins (the solution rotates the stem)', () => {
    expect(uses(level, ['rotateStem'])).toBe(true);
    expect(wins(level)(solved(level))).toBe(true);
    const walk = explore(level.start, { goal: wins(level) });
    expect(walk.reached).toBe(true);
  });
});
