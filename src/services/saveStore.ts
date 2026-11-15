import { loadSave, writeSave, type KeyValueStore, type SaveData } from './save';
import { mergeSaves } from './saveMerge';

/**
 * The live progress of the player, shared by the game and the books so that there is a single
 * writer: whoever changes the progress does it here, and it is written at once.
 */
export interface SaveStore {
  /** The progress as it is now. */
  get(): SaveData;
  /**
   * Takes in what another tab wrote, replaces the progress with `change(progress)`, writes it, and
   * tells every subscriber.
   */
  update(change: (save: SaveData) => SaveData): void;
  /** Takes in what another tab wrote (the browser's `storage` event); tells only if it added. */
  refresh(): void;
  /** Calls `listener` with the new progress after each update; returns the unsubscribe function. */
  subscribe(listener: (save: SaveData) => void): () => void;
}

/**
 * Opens the progress kept in `storage` (or starts afresh, as `loadSave` decides). The game may be
 * open in two tabs at once, each with its own copy: so each update first rereads what is stored
 * and merges it in (`mergeSaves`, which never loses a level won nor anything done), and a tab never
 * covers the other's progress. An update that adds nothing (a level already written in the
 * notebook, and nothing new from another tab) neither writes nor tells anyone. If the browser
 * refuses to store it, `writeSave` lets the game go on with the progress in memory only.
 */
export function createSaveStore(storage: KeyValueStore): SaveStore {
  let current = loadSave(storage);
  const listeners = new Set<(save: SaveData) => void>();
  /** Makes `next` the progress and tells every subscriber. */
  const adopt = (next: SaveData): void => {
    current = next;
    for (const listener of [...listeners]) listener(current);
  };
  return {
    get: () => current,
    update(change) {
      const next = change(mergeSaves(current, loadSave(storage)));
      if (next === current) return;
      writeSave(storage, next);
      adopt(next);
    },
    refresh() {
      const next = mergeSaves(current, loadSave(storage));
      if (next !== current) adopt(next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
