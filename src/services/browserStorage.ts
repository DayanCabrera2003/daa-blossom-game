import type { KeyValueStore } from './save';

/**
 * The browser's storage, or memory when it is missing or refused. Merely reading `localStorage`
 * throws in some browsers (private mode, blocked cookies); then the game goes on without saving
 * between visits instead of failing to start. `locate` is injected so this can be tested.
 */
export function browserStorage(
  locate: () => KeyValueStore | undefined = () => globalThis.localStorage,
): KeyValueStore {
  try {
    const store = locate();
    if (store !== undefined) return store;
  } catch {
    // Access refused: fall through to memory.
  }
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
  };
}
