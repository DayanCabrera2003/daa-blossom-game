import { checkTutteBerge } from '@core/certificates/tutteBerge';
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
      key: 'hud.councilProves',
      params: { groups: 1, stones: 0, atLeast: 1, dark: 1 },
    });
  });

  it('with C lifted in the helix, says 3 − 1 = 2, and there are 2 in the dark: it adds up (7.3)', () => {
    const level = helixLevel();
    expect(councilCount(level, level.start)).toEqual({
      key: 'hud.council',
      params: { groups: 0, stones: 0, atLeast: 0, dark: 2 },
    });
    const lifted = play(level, [{ type: 'liftStone', vertex: 0 }]);
    expect(councilCount(level, lifted)).toEqual({
      key: 'hud.councilProves',
      params: { groups: 3, stones: 1, atLeast: 2, dark: 2 },
    });
  });

  it('says it adds up exactly when the stones prove the lanterns, as the Council checks them', () => {
    const level = helixLevel();
    for (let vertex = 0; vertex < level.graph.n; vertex++) {
      const lifted = play(level, [{ type: 'liftStone', vertex }]);
      const proves = checkTutteBerge(lifted.graph, lifted.matching, lifted.stones).ok;
      expect(councilCount(level, lifted)?.key === 'hud.councilProves').toBe(proves);
    }
  });

  it('never writes a false subtraction: with more stones than odd groups it subtracts nothing', () => {
    const level = helixLevel();
    // Six stones out of ten sprouts leave four, so at most four groups: fewer than the stones.
    const lifted = play(
      level,
      [0, 1, 2, 3, 4, 5].map((vertex) => ({ type: 'liftStone', vertex }) as const),
    );
    const count = councilCount(level, lifted);
    expect(count?.key).toBe('hud.councilNoBound');
    expect(count?.params).not.toHaveProperty('atLeast');
    expect(Number(count?.params.groups)).toBeLessThan(Number(count?.params.stones));
  });

  it('in the fog, it is only worked out once presented with "Terminé" (7.5)', () => {
    const base = helixLevel();
    const level = { ...base, data: { ...base.data, fog: true } };
    const lifted = play(level, [{ type: 'liftStone', vertex: 0 }]);
    expect(councilCount(level, lifted)).toEqual({ key: 'hud.councilHidden', params: {} });
    expect(councilCount(level, { ...lifted, declaredDone: true })).toEqual({
      key: 'hud.councilProves',
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
