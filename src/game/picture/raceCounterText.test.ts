import { describe, expect, it } from 'vitest';
import { raceCounterText } from './raceCounterText';

describe('what the counter of a runner says (6.4, 6.5)', () => {
  it('counts steps while running, and says so once finished', () => {
    const running = { steps: 7, finished: false, asleep: false };
    expect(raceCounterText('automaton', running)).toEqual({
      key: 'race.counter.automaton',
      params: { steps: 7 },
    });
    const finished = { steps: 41, finished: true, asleep: false };
    expect(raceCounterText('bruto', finished)).toEqual({
      key: 'race.counter.brutoDone',
      params: { steps: 41 },
    });
  });

  it('says Bruto fell asleep, never how many steps his budget allowed', () => {
    const asleep = { steps: 1_000_000, finished: false, asleep: true };
    expect(raceCounterText('bruto', asleep)).toEqual({
      key: 'race.counter.brutoAsleep',
      params: {},
    });
  });
});
