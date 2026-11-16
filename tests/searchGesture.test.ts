import { isMaximum } from '@core/edmonds/fast/maximum';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory, statusOf } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { explore } from './support/gardenExplorer';

// The levels whose gesture is the search itself (GDD §7, chapter 3, 4.3 and 4.13): their lanterns
// move only along the chain the player's marks reached (`seen`), so a few looks and a chain dragged
// by eye win nothing. It is proved over every garden the level lets the player reach, as for the
// flower levels: without marking, the victory is out of reach; with the marks of the reference
// solution, it is won.

const SEARCH_LEVELS = ['3.1', '3.2', '3.4', '3.5', '3.9', '3.10', '4.3', '4.13'];

/** The marks the player puts by hand: the gesture these levels teach. */
const MARKS: readonly Action['type'][] = ['markRoot', 'markMoon'];

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** Applies a move the rules must accept. */
const play = (state: GardenState, action: Action): GardenState => {
  const outcome = applyAction(state, action);
  if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
  return outcome.state;
};

/**
 * Whether the level's victory holds, "Terminé" taken as said. The walk never places scarecrows (they
 * change neither the lanterns nor the marks), so a certificate of scarecrows counts as soon as the
 * lanterns are the most: then König's scarecrows exist, and placing them is free.
 */
const wins = (level: Level) => (state: GardenState) => {
  const { victory } = level.data;
  if (victory === undefined) throw new Error(`level ${level.data.id} has no victory`);
  if (victory.type === 'coverCertificate') {
    const searched = victory.afterSearch !== true || statusOf(state) === 'exhausted';
    return isMaximum(state.graph, state.matching) && searched;
  }
  return isVictory({ ...state, declaredDone: true }, victory);
};

describe.each(SEARCH_LEVELS)('%s: the search is the gesture', (id) => {
  const level = levelById(id);

  it('lights lanterns only along the chain the marks reached, the marks by hand', () => {
    expect(level.start.chains).toEqual({ rule: 'seen' });
    expect(level.data.light).not.toBe(true);
    for (const type of MARKS) expect(level.start.allowed.has(type)).toBe(true);
  });

  it('cannot be won without marking, whatever the order of the moves it allows', () => {
    const walk = explore(level.start, { without: MARKS, goal: wins(level) });
    expect(walk).toMatchObject({ reached: false, witness: null });
  }, 20_000);

  it('is won by its reference solution, which marks', () => {
    expect(level.solution.some((action) => MARKS.includes(action.type))).toBe(true);
    const end = level.solution.reduce(play, level.start);
    expect(wins(level)(end)).toBe(true);
  });
});

describe('3.8: no gift without the search', () => {
  const level = levelById('3.8');

  it('without marking, the search never ends, so no scarecrows can be presented', () => {
    const walk = explore(level.start, { without: MARKS, goal: wins(level) });
    expect(walk).toMatchObject({ reached: false, witness: null });
  });

  it('with the search of its reference solution, it is won', () => {
    const end = level.solution.reduce(play, level.start);
    expect(wins(level)(end)).toBe(true);
  });
});
