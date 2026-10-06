import { describe, expect, it } from 'vitest';
import { memoryStore } from '../../tests/support/memoryStore';
import { appendEntry, emptyLog } from './playtestLog';
import { playtestRecorder } from './playtestRecorder';
import { loadLog, writeLog } from './playtestStore';

describe('playtest recorder', () => {
  it('goes on from the log kept by earlier visits', () => {
    const store = memoryStore();
    const earlier = appendEntry(emptyLog(), { kind: 'sessionStart', at: 1 });
    writeLog(store, earlier);
    expect(playtestRecorder(store).current()).toEqual(earlier);
  });

  it('keeps every entry recorded, at once, so closing the page loses nothing', () => {
    const store = memoryStore();
    const recorder = playtestRecorder(store);
    recorder.record([{ kind: 'sessionStart', at: 2 }]);
    recorder.record([
      { kind: 'levelStart', at: 3, level: '0.1' },
      { kind: 'move', at: 4, level: '0.1', action: 'join' },
    ]);
    expect(recorder.current().entries).toHaveLength(3);
    expect(loadLog(store)).toEqual(recorder.current());
  });

  it('a step with nothing to record does not touch storage', () => {
    const store = memoryStore();
    playtestRecorder(store).record([]);
    expect(store.data.size).toBe(0);
  });
});
