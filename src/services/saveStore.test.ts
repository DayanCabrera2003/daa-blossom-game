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

  it('two tabs on the same storage never cover what the other one won', () => {
    const storage = memoryStore();
    const first = createSaveStore(storage);
    const second = createSaveStore(storage);
    first.update((save) => recordCompletion(save, '1.1', 2));
    second.update((save) => recordCompletion(save, '2.4', 1));
    first.update((save) => recordNotebook(save, '1.5'));
    const kept = loadSave(storage);
    expect(kept.levels).toEqual({ '1.1': { stars: 2 }, '2.4': { stars: 1 } });
    expect(kept.notebook).toEqual(['1.5']);
    expect(first.get()).toEqual(kept);
  });

  it('an update that changes nothing still takes in what another tab wrote', () => {
    const storage = memoryStore();
    const first = createSaveStore(storage);
    createSaveStore(storage).update((save) => recordCompletion(save, '0.1', 3));
    const heard: SaveData[] = [];
    first.subscribe((save) => heard.push(save));
    first.update((save) => save);
    expect(first.get().levels['0.1']).toEqual({ stars: 3 });
    expect(heard).toHaveLength(1);
  });

  it('refresh takes in what another tab wrote and tells the subscribers, once', () => {
    const storage = memoryStore();
    const first = createSaveStore(storage);
    let heard = 0;
    first.subscribe(() => (heard += 1));
    first.refresh();
    expect(heard).toBe(0);
    createSaveStore(storage).update((save) => recordCompletion(save, '1.1', 1));
    first.refresh();
    first.refresh();
    expect(first.get().levels['1.1']).toEqual({ stars: 1 });
    expect(heard).toBe(1);
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
