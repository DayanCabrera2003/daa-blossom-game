import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { describe, expect, it } from 'vitest';
import { closedFlowerLevel, helixLevel, pentagonLevel } from '../../../tests/support/fixtureLevels';
import { councilCount } from './council';

/** Plays moves from a level's start; a refusal here is a test bug. */
const play = (level: Level, moves: readonly Action[]): GardenState =>
  moves.reduce((state, move) => {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${outcome.reason.code}`);
    return outcome.state;
  }, level.start);

describe("the Council's count on the top bar", () => {
  it('is not there before 7.2', () => {
    const level = closedFlowerLevel();
    expect(councilCount(level, level.start)).toBeNull();
  });

  it('speaks with no stone lifted (7.2): one odd group of five, at least one in the dark', () => {
    const level = pentagonLevel();
    expect(councilCount(level, level.start)).toEqual({
      key: 'hud.council',
      params: { groups: 1, stones: 0, atLeast: 1, dark: 1 },
    });
  });

  it('with C lifted in the helix, says 3 − 1 = 2, and there are 2 in the dark (7.3)', () => {
    const level = helixLevel();
    expect(councilCount(level, level.start)).toEqual({
      key: 'hud.council',
      params: { groups: 0, stones: 0, atLeast: 0, dark: 2 },
    });
    const lifted = play(level, [{ type: 'liftStone', vertex: 0 }]);
    expect(councilCount(level, lifted)).toEqual({
      key: 'hud.council',
      params: { groups: 3, stones: 1, atLeast: 2, dark: 2 },
    });
  });

  it('never says fewer than none: more stones than odd groups need nobody in the dark', () => {
    const level = helixLevel();
    const lifted = play(level, [
      { type: 'liftStone', vertex: 1 },
      { type: 'liftStone', vertex: 2 },
    ]);
    expect(councilCount(level, lifted)?.params.atLeast).toBe(0);
  });

  it('in the fog, it is only worked out once presented with "Terminé" (7.5)', () => {
    const base = helixLevel();
    const level = { ...base, data: { ...base.data, fog: true } };
    const lifted = play(level, [{ type: 'liftStone', vertex: 0 }]);
    expect(councilCount(level, lifted)).toEqual({ key: 'hud.councilHidden', params: {} });
    expect(councilCount(level, { ...lifted, declaredDone: true })).toEqual({
      key: 'hud.council',
      params: { groups: 3, stones: 1, atLeast: 2, dark: 2 },
    });
  });

  it('follows the level it is told: a pentagon shown as 7.1 has no count, and as 7.2 has one', () => {
    const level = pentagonLevel();
    expect(councilCount(level, level.start, '7.1')).toBeNull();
    const closed = closedFlowerLevel();
    expect(councilCount(closed, closed.start, '7.2')).not.toBeNull();
  });
});
