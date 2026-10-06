import { describe, expect, it } from 'vitest';
import {
  emptySave,
  loadSave,
  recordCompletion,
  recordNotebook,
  SAVE_KEY,
  writeSave,
  type KeyValueStore,
} from './save';
import { memoryStore } from '../../tests/support/memoryStore';

describe('saved progress', () => {
  it('a new player starts with nothing completed', () => {
    expect(loadSave(memoryStore())).toEqual(emptySave());
  });

  it('what is written comes back', () => {
    const store = memoryStore();
    const save = recordCompletion(emptySave(), '0.1', 2);
    writeSave(store, save);
    expect(loadSave(store)).toEqual(save);
  });

  it('keeps the best result of a level', () => {
    const twice = recordCompletion(recordCompletion(emptySave(), '1.1', 3), '1.1', 1);
    expect(twice.levels['1.1']).toEqual({ stars: 3 });
  });

  it('a new player has written nothing in the notebook', () => {
    expect(emptySave()).toEqual({ version: 2, levels: {}, notebook: [] });
  });

  it('writes a statement in the notebook once, keeping the order it was written in', () => {
    const notes = recordNotebook(recordNotebook(recordNotebook(emptySave(), '1.5'), '2.4'), '1.5');
    expect(notes.notebook).toEqual(['1.5', '2.4']);
  });

  it('a save of version 1 keeps all its progress, with an empty notebook', () => {
    const v1 = '{"version":1,"levels":{"0.1":{"stars":3},"1.2":{"stars":1}}}';
    expect(loadSave(memoryStore({ [SAVE_KEY]: v1 }))).toEqual({
      version: 2,
      levels: { '0.1': { stars: 3 }, '1.2': { stars: 1 } },
      notebook: [],
    });
  });

  it('a damaged notebook is no excuse to lose the save: it starts afresh like any damage', () => {
    const bad = '{"version":2,"levels":{},"notebook":[7]}';
    expect(loadSave(memoryStore({ [SAVE_KEY]: bad }))).toEqual(emptySave());
  });

  it('never fails on damaged or foreign data: it starts afresh', () => {
    expect(loadSave(memoryStore({ [SAVE_KEY]: '{not json' }))).toEqual(emptySave());
    expect(loadSave(memoryStore({ [SAVE_KEY]: '{"version":99,"levels":{}}' }))).toEqual(
      emptySave(),
    );
    expect(
      loadSave(memoryStore({ [SAVE_KEY]: '{"version":1,"levels":{"0.1":{"stars":-2}}}' })),
    ).toEqual(emptySave());
  });

  it('never fails if the browser refuses storage (private mode)', () => {
    const refusing: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadSave(refusing)).toEqual(emptySave());
    expect(() => writeSave(refusing, emptySave())).not.toThrow();
  });
});
