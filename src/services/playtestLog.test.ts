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

  it('rejects what is not a log of this version', () => {
    expect(parseLog({ version: 2, entries: [] })).toBeNull();
    expect(parseLog({ version: 1, entries: [{ kind: 'dance', at: 0 }] })).toBeNull();
    expect(parseLog('nonsense')).toBeNull();
  });
});
