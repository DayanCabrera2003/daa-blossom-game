import { describe, expect, it } from 'vitest';
import { memoryStore } from '../../tests/support/memoryStore';
import { appendEntry, emptyLog } from './playtestLog';
import { loadLog, PLAYTEST_KEY, writeLog } from './playtestStore';

describe('playtest log storage', () => {
  it('a first visit has an empty log', () => {
    expect(loadLog(memoryStore())).toEqual(emptyLog());
  });

  it('what is written comes back, under its own key, apart from the save', () => {
    const store = memoryStore();
    const log = appendEntry(emptyLog(), { kind: 'sessionStart', at: 42 });
    writeLog(store, log);
    expect(loadLog(store)).toEqual(log);
    expect([...store.data.keys()]).toEqual([PLAYTEST_KEY]);
  });

  it('never fails on damaged or foreign data: it starts a new log', () => {
    expect(loadLog(memoryStore({ [PLAYTEST_KEY]: '{oops' }))).toEqual(emptyLog());
    expect(loadLog(memoryStore({ [PLAYTEST_KEY]: '{"version":9}' }))).toEqual(emptyLog());
  });

  it('a browser refusing storage costs the log, never the game', () => {
    const refusing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadLog(refusing)).toEqual(emptyLog());
    expect(() => writeLog(refusing, emptyLog())).not.toThrow();
  });
});
