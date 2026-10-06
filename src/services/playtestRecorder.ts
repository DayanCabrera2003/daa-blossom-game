import { appendEntry, type PlaytestEntry, type PlaytestLog } from './playtestLog';
import { loadLog, writeLog } from './playtestStore';
import type { KeyValueStore } from './save';

/** The playtest log of this browser, as the scenes add to it. */
export interface PlaytestRecorder {
  /** Adds entries at the end of the log and keeps it at once. */
  record(entries: readonly PlaytestEntry[]): void;
  /** The log as it is now, for exporting. */
  current(): PlaytestLog;
}

/**
 * Opens the log kept in `store` by earlier visits and goes on writing to it. Every step is written
 * straight away: a playtester who closes the tab loses nothing they did.
 */
export function playtestRecorder(store: KeyValueStore): PlaytestRecorder {
  let log = loadLog(store);
  return {
    record(entries) {
      if (entries.length === 0) return;
      log = entries.reduce(appendEntry, log);
      writeLog(store, log);
    },
    current: () => log,
  };
}
