import { describe, expect, it } from 'vitest';
import { appendEntry, emptyLog, parseLog } from './playtestLog';

describe('playtest log', () => {
  it('starts empty and keeps entries in the order they happen', () => {
    const log = appendEntry(appendEntry(emptyLog(), { kind: 'levelStart', at: 10, level: '0.1' }), {
      kind: 'move',
      at: 12,
      level: '0.1',
      action: 'join',
    });
    expect(log).toEqual({
      version: 1,
      entries: [
        { kind: 'levelStart', at: 10, level: '0.1' },
        { kind: 'move', at: 12, level: '0.1', action: 'join' },
      ],
    });
  });

  it('never changes the log it was given', () => {
    const log = emptyLog();
    appendEntry(log, { kind: 'sessionStart', at: 0 });
    expect(log.entries).toEqual([]);
  });

  it('reads back every kind of entry it can hold', () => {
    const log = {
      version: 1,
      entries: [
        { kind: 'sessionStart', at: 0 },
        { kind: 'levelStart', at: 1, level: '4.1' },
        { kind: 'move', at: 2, level: '4.1', action: 'chain' },
        { kind: 'refused', at: 3, level: '4.1', action: 'join', reason: 'alreadyLit' },
        { kind: 'hint', at: 4, level: '4.1', grade: 1 },
        { kind: 'claim', at: 5, level: '4.1', right: false },
        { kind: 'history', at: 6, level: '4.1', move: 'undo' },
        { kind: 'levelEnd', at: 7, level: '4.1', outcome: 'won', stars: 2 },
        { kind: 'levelEnd', at: 8, level: '4.1', outcome: 'left', stars: null },
      ],
    };
    expect(parseLog(log)).toEqual(log);
  });

  it('reads back answers, bets, notebook choices, counterexamples, mirror checks, vines and chains', () => {
    const log = {
      version: 1,
      entries: [
        { kind: 'answer', at: 1, level: '1.2', step: 3, option: 0, right: false },
        { kind: 'bet', at: 2, level: '1.6', value: 4, right: true, informal: false },
        { kind: 'notebook', at: 3, level: '1.9', option: 2, right: false },
        { kind: 'counterexample', at: 4, level: '1.9', option: 2 },
        { kind: 'mirrorCheck', at: 5, level: '2.4', beats: true, counted: true },
        { kind: 'pickVine', at: 6, level: '4.2', step: 1, vine: ['b', 'c'], right: false },
        { kind: 'flowerChain', at: 7, level: '4.11', path: ['e', 't'], counted: true },
        { kind: 'recipeCheck', at: 8, level: '6.1', step: 0, card: 'moonToSun', case: 'moon' },
        { kind: 'recipeCheck', at: 9, level: '6.1', step: 0, card: null, case: null },
      ],
    };
    expect(parseLog(log)).toEqual(log);
  });

  it('still reads a log written before answers were recorded: the new entries only add kinds', () => {
    const older = { version: 1, entries: [{ kind: 'levelStart', at: 0, level: '0.1' }] };
    expect(parseLog(older)).toEqual(older);
  });

  it('rejects what is not a log of this version', () => {
    expect(parseLog({ version: 2, entries: [] })).toBeNull();
    expect(parseLog({ version: 1, entries: [{ kind: 'dance', at: 0 }] })).toBeNull();
    expect(parseLog('nonsense')).toBeNull();
  });
});
