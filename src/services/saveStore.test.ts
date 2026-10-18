import { describe, expect, it } from 'vitest';
import { memoryStore } from '../../tests/support/memoryStore';
import {
  emptySave,
  loadSave,
  recordCompletion,
  recordNotebook,
  SAVE_KEY,
  type SaveData,
} from './save';
import { createSaveStore } from './saveStore';

describe('shared save store', () => {
  it('starts from the progress kept in storage', () => {
    const storage = memoryStore();
    const kept = recordCompletion(emptySave(), '0.1', 3);
    storage.setItem(SAVE_KEY, JSON.stringify(kept));
    expect(createSaveStore(storage).get()).toEqual(kept);
  });

  it('writes every update at once', () => {
    const storage = memoryStore();
    const saves = createSaveStore(storage);
    saves.update((save) => recordCompletion(save, '1.1', 2));
    expect(saves.get().levels['1.1']).toEqual({ stars: 2 });
    expect(loadSave(storage)).toEqual(saves.get());
  });

  it('tells each subscriber the new progress, until it unsubscribes', () => {
    const saves = createSaveStore(memoryStore());
    const heard: SaveData[] = [];
    const unsubscribe = saves.subscribe((save) => heard.push(save));
    saves.update((save) => recordNotebook(save, '1.5'));
    unsubscribe();
    saves.update((save) => recordNotebook(save, '2.4'));
    expect(heard).toHaveLength(1);
    expect(heard[0]?.notebook).toEqual(['1.5']);
  });

  it('an update that changes nothing neither writes nor tells anyone', () => {
    const storage = memoryStore();
    const saves = createSaveStore(storage);
    let heard = 0;
    saves.subscribe(() => (heard += 1));
    saves.update((save) => save);
    expect(storage.data.size).toBe(0);
    expect(heard).toBe(0);
  });

  it('keeps the progress in memory when the browser refuses to store it', () => {
    const refusing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const saves = createSaveStore(refusing);
    saves.update((save) => recordCompletion(save, '0.2', 1));
    expect(saves.get().levels['0.2']).toEqual({ stars: 1 });
  });
});
