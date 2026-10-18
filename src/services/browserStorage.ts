import type { KeyValueStore } from './save';

/** The browser's storage as the game uses it: it never throws, and says when it cannot keep. */
export interface BrowserStorage extends KeyValueStore {
  /**
   * Calls `listener` once, the first time the browser refuses to keep something (at once if it
   * already has, or gives no storage at all), so the page can say that the progress will last
   * only while the tab is open.
   */
  onRefused(listener: () => void): void;
}

/**
 * The browser's storage, made safe for the game (plan 09, phase 10). Merely reading `localStorage`
 * throws in some browsers (private mode, blocked cookies); a write throws when the quota is full,
 * or when storage is blocked while the game runs. None of it stops the game or loses the session:
 * without storage the game keeps everything in memory, and a write the browser refuses is kept in
 * memory too and read back from there, so the progress, the settings and the design go on for as
 * long as the tab is open. `locate` is injected so this can be tested.
 */
export function browserStorage(
  locate: () => KeyValueStore | undefined = () => globalThis.localStorage,
): BrowserStorage {
  let store: KeyValueStore | undefined;
  try {
    store = locate();
  } catch {
    // Access refused: everything stays in memory.
  }
  /** What this session wrote and the browser did not keep; read before the browser's storage. */
  const memory = new Map<string, string>();
  let refused = store === undefined;
  let listeners: (() => void)[] = [];
  /** The first refusal tells every listener, once. */
  const refuse = (): void => {
    if (refused) return;
    refused = true;
    for (const listener of listeners) listener();
    listeners = [];
  };
  return {
    getItem(key) {
      const kept = memory.get(key);
      if (kept !== undefined || store === undefined) return kept ?? null;
      try {
        return store.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      if (store !== undefined) {
        try {
          store.setItem(key, value);
          memory.delete(key);
          return;
        } catch {
          refuse();
        }
      }
      memory.set(key, value);
    },
    onRefused(listener) {
      if (refused) listener();
      else listeners.push(listener);
    },
  };
}
