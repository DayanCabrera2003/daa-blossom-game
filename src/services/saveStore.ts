import { loadSave, writeSave, type KeyValueStore, type SaveData } from './save';

/**
 * The live progress of the player, shared by the game and the books so that there is a single
 * writer: whoever changes the progress does it here, and it is written at once.
 */
export interface SaveStore {
  /** The progress as it is now. */
  get(): SaveData;
  /** Replaces the progress with `change(current)`, writes it, and tells every subscriber. */
  update(change: (save: SaveData) => SaveData): void;
  /** Calls `listener` with the new progress after each update; returns the unsubscribe function. */
  subscribe(listener: (save: SaveData) => void): () => void;
}

/**
 * Opens the progress kept in `storage` (or starts afresh, as `loadSave` decides). An update that
 * returns the same progress (a level already written in the notebook) neither writes nor tells
 * anyone. If the browser refuses to store it, `writeSave` lets the game go on with the progress in
 * memory only.
 */
export function createSaveStore(storage: KeyValueStore): SaveStore {
  let current = loadSave(storage);
  const listeners = new Set<(save: SaveData) => void>();
  return {
    get: () => current,
    update(change) {
      const next = change(current);
      if (next === current) return;
      current = next;
      writeSave(storage, current);
      for (const listener of [...listeners]) listener(current);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
