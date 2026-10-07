import { describe, expect, it } from 'vitest';
import type { CounterexampleEffect } from './counterexampleController';
import { counterexampleEntries } from './counterexampleEntries';

const thread = { kind: 'thread', sprouts: [0, 1], strands: [], gain: 1 } as const;

describe('playtest entries of the counterexample screen', () => {
  it('a reflection checked over a counterexample garden is logged under its level', () => {
    const effects: CounterexampleEffect[] = [
      { kind: 'mirrorChecked', check: { kind: 'notBetter', drawn: 1, yours: 2, spared: false } },
      { kind: 'mirrorChecked', check: { kind: 'better', pieces: [], piece: thread, fresh: true } },
      { kind: 'say', line: 'ch2.4.sauce.05' },
    ];
    expect(counterexampleEntries('2.4', effects, 8)).toEqual([
      { kind: 'mirrorCheck', at: 8, level: '2.4', beats: false, counted: false },
      { kind: 'mirrorCheck', at: 8, level: '2.4', beats: true, counted: true },
    ]);
  });

  it('moves, refusals and lines of a counterexample are not logged', () => {
    const effects: CounterexampleEffect[] = [
      { kind: 'animate', action: { type: 'join', u: 0, v: 1 }, events: [] },
      { kind: 'rejected', reason: { code: 'notNow' }, action: { type: 'declareDone' } },
      { kind: 'drawRefused', reason: { code: 'twoSilver', vertex: 1 } },
    ];
    expect(counterexampleEntries('1.5', effects, 0)).toEqual([]);
  });
});
