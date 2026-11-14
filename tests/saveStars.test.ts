import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import { starsCeiling } from '@levels/starsCeiling';
import {
  emptySave,
  loadSave,
  recordCompletion,
  writeSave,
  type KeyValueStore,
} from '@services/save';

// The save keeps each level's best stars under a maximum of its own. A level that could give more
// (water and a formal bet together give four) would write a save that no longer reads back, and
// the whole progress would be lost on the next start. So every level of the catalogue, won with
// everything in its favour, must survive a save and a load.

/** A store in memory, standing in for the browser's. */
function memoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

describe('the save holds the most stars any level can give', () => {
  it('every level won with all its stars reads back from the save unchanged', () => {
    for (const level of catalog()) {
      const most = starsCeiling(level.data);
      const store = memoryStore();
      writeSave(store, recordCompletion(emptySave(), level.data.id, most));
      expect(loadSave(store).levels[level.data.id]?.stars, level.data.id).toBe(most);
    }
  });
});
