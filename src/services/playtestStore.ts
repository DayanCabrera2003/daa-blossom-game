import { emptyLog, parseLog, type PlaytestLog } from './playtestLog';
import type { KeyValueStore } from './save';

/** Where the playtest log is kept in the browser; it never leaves it unless exported. */
export const PLAYTEST_KEY = 'florecer.playtest';

/** Reads the log; anything unreadable starts a new one, like the save does. */
export function loadLog(store: KeyValueStore): PlaytestLog {
  try {
    const raw = store.getItem(PLAYTEST_KEY);
    return raw === null ? emptyLog() : (parseLog(JSON.parse(raw)) ?? emptyLog());
  } catch {
    return emptyLog();
  }
}

/** Writes the log; if the browser refuses, the playtest goes on unrecorded. */
export function writeLog(store: KeyValueStore, log: PlaytestLog): void {
  try {
    store.setItem(PLAYTEST_KEY, JSON.stringify(log));
  } catch {
    // Storage refused (private mode, quota): the log lives only for this session.
  }
}
