import { describe, expect, it } from 'vitest';
import {
  emptySave,
  loadSave,
  recordCompletion,
  SAVE_KEY,
  writeSave,
  type KeyValueStore,
} from './save';

/** An in-memory stand-in for localStorage. */
const memory = (
  initial: Record<string, string> = {},
): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

describe('saved progress', () => {
  it('a new player starts with nothing completed', () => {
    expect(loadSave(memory())).toEqual(emptySave());
  });

  it('what is written comes back', () => {
    const store = memory();
    const save = recordCompletion(emptySave(), '0.1', 2);
    writeSave(store, save);
    expect(loadSave(store)).toEqual(save);
  });

  it('keeps the best result of a level', () => {
    const twice = recordCompletion(recordCompletion(emptySave(), '1.1', 3), '1.1', 1);
    expect(twice.levels['1.1']).toEqual({ stars: 3 });
  });

  it('never fails on damaged or foreign data: it starts afresh', () => {
    expect(loadSave(memory({ [SAVE_KEY]: '{not json' }))).toEqual(emptySave());
    expect(loadSave(memory({ [SAVE_KEY]: '{"version":99,"levels":{}}' }))).toEqual(emptySave());
    expect(loadSave(memory({ [SAVE_KEY]: '{"version":1,"levels":{"0.1":{"stars":-2}}}' }))).toEqual(
      emptySave(),
    );
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
