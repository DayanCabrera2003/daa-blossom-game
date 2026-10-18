import { applyAction } from '@core/rules/applyAction';
import { createGardenState } from '@core/rules/state';
import { describe, expect, it } from 'vitest';
import { festivalLevel } from '../../../tests/support/fixtureLevels';
import { playDay } from './playedDay';

// The festival garden: R a b c d e = 0…5, all in the dark, where lanterns may be lit and put out.
const start = createGardenState({ graph: festivalLevel().graph, allowed: ['join', 'split'] });

describe('a day played with the rules', () => {
  it('keeps every garden of the day and, beside each, the events that made it', () => {
    const day = playDay(
      start,
      [
        { type: 'join', u: 0, v: 1 },
        { type: 'split', u: 0, v: 1 },
      ],
      'test moves',
    );
    expect(day.states).toHaveLength(3);
    expect(day.states[0]).toBe(start);
    expect(day.events).toEqual([
      [],
      [{ type: 'light', u: 0, v: 1 }],
      [{ type: 'putOut', u: 0, v: 1 }],
    ]);
    const joined = applyAction(start, { type: 'join', u: 0, v: 1 });
    expect(joined.ok && day.states[1]).toEqual(joined.ok ? joined.state : null);
  });

  it('a move the rules refuse is a broken catalog', () => {
    expect(() => playDay(start, [{ type: 'join', u: 0, v: 5 }], 'test moves')).toThrow(
      /test moves/,
    );
  });
});
