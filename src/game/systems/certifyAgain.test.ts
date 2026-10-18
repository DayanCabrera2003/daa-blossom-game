import { applyAction } from '@core/rules/applyAction';
import type { Action } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import type { LevelStep } from '@levels/flow';
import { describe, expect, it } from 'vitest';
import { councilLevel } from '../../../tests/support/secretScripts';
import { judgeVictory } from './certifyAgain';

/** Plays moves in order; a refusal here is a test bug. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

const level = councilLevel();
const { victory } = level.data;
const [a, b, , , , r, C] = [0, 1, 2, 3, 4, 5, 6];
/** The four lanterns lit, no stone lifted: not yet presented. */
const lit = play(level.start, [
  { type: 'join', u: a, v: b },
  { type: 'join', u: r, v: C },
]);
const noStones = play(lit, [{ type: 'declareDone' }]);
const bridge = play(lit, [{ type: 'liftStone', vertex: C }, { type: 'declareDone' }]);
const playing: LevelStep = { step: 'play', reactions: [] };
const again: LevelStep = { step: 'certifyAgain' };

describe('the certificates presented to the council', () => {
  it('playing, the first certificate wins and is remembered', () => {
    expect(judgeVictory(playing, [], lit, victory)).toEqual({ kind: 'none' });
    expect(judgeVictory(playing, [], noStones, victory)).toEqual({
      kind: 'won',
      certificates: [[]],
    });
  });

  it('asked for another, only stones different from all those presented win', () => {
    expect(judgeVictory(again, [[]], noStones, victory)).toEqual({ kind: 'repeated' });
    expect(judgeVictory(again, [[]], bridge, victory)).toEqual({
      kind: 'won',
      certificates: [[], [C]],
    });
    // The same stones lifted in another order are the same certificate.
    const both = play(lit, [
      { type: 'liftStone', vertex: C },
      { type: 'liftStone', vertex: b },
      { type: 'declareDone' },
    ]);
    expect(judgeVictory(again, [[b, C]], both, victory)).toEqual({ kind: 'repeated' });
  });

  it('nothing is judged outside these two steps, nor without a victory', () => {
    expect(judgeVictory(null, [], noStones, victory)).toEqual({ kind: 'none' });
    expect(judgeVictory({ step: 'sun' }, [], noStones, victory)).toEqual({ kind: 'none' });
    expect(judgeVictory(playing, [], noStones, undefined)).toEqual({ kind: 'none' });
    expect(judgeVictory(again, [[]], lit, victory)).toEqual({ kind: 'none' });
  });
});
