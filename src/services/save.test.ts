import { describe, expect, it } from 'vitest';
import {
  emptySave,
  loadSave,
  recordGlossaryRows,
  recordPageRead,
  recordCompletion,
  recordNotebook,
  recordTutorialSeen,
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

  it('a new player has written nothing in the notebook, seen no mechanic card, read no page', () => {
    expect(emptySave()).toEqual({
      version: 4,
      levels: {},
      notebook: [],
      tutorialsSeen: [],
      codexRead: [],
      glossaryRead: [],
    });
  });

  it('records each Codex page read once, tab by tab, in the order read', () => {
    const read = recordPageRead(
      recordPageRead(recordPageRead(emptySave(), 'C1:intuition'), 'C1:formal'),
      'C1:intuition',
    );
    expect(read.codexRead).toEqual(['C1:intuition', 'C1:formal']);
    expect(recordPageRead(read, 'C1:formal')).toBe(read);
  });

  it('records the glossary rows seen of each entry once, keeping the order seen', () => {
    const seen = recordGlossaryRows(recordGlossaryRows(emptySave(), ['C1', 'C2']), ['C2', 'C3']);
    expect(seen.glossaryRead).toEqual(['C1', 'C2', 'C3']);
    expect(recordGlossaryRows(seen, ['C3', 'C1'])).toBe(seen);
  });

  it('what was read comes back from the store', () => {
    const store = memoryStore();
    const save = recordGlossaryRows(recordPageRead(emptySave(), 'C13:bridge'), ['C1']);
    writeSave(store, save);
    expect(loadSave(store)).toEqual(save);
  });

  it('a save of version 3 keeps its progress, notebook and cards, with no page read', () => {
    const v3 =
      '{"version":3,"levels":{"2.4":{"stars":3}},"notebook":["1.5","2.4"],"tutorialsSeen":["sun"]}';
    expect(loadSave(memoryStore({ [SAVE_KEY]: v3 }))).toEqual({
      version: 4,
      levels: { '2.4': { stars: 3 } },
      notebook: ['1.5', '2.4'],
      tutorialsSeen: ['sun'],
      codexRead: [],
      glossaryRead: [],
    });
  });

  it('a page read that is not a tab of the Codex is damage, like any other', () => {
    const save = (read: string, rows: string): string =>
      `{"version":4,"levels":{},"notebook":[],"tutorialsSeen":[],"codexRead":${read},"glossaryRead":${rows}}`;
    for (const bad of [save('["C15:formal"]', '[]'), save('["C1"]', '[]'), save('[]', '["C15"]')]) {
      expect(loadSave(memoryStore({ [SAVE_KEY]: bad }))).toEqual(emptySave());
    }
    expect(loadSave(memoryStore({ [SAVE_KEY]: save('["C1:formal"]', '["C1"]') }))).toEqual({
      ...emptySave(),
      codexRead: ['C1:formal'],
      glossaryRead: ['C1'],
    });
  });

  it('records each mechanic card once, in the order seen', () => {
    const seen = recordTutorialSeen(
      recordTutorialSeen(recordTutorialSeen(emptySave(), 'lanterns'), 'sun'),
      'lanterns',
    );
    expect(seen.tutorialsSeen).toEqual(['lanterns', 'sun']);
  });

  it('a save of version 2 keeps all its progress and notebook, with no card seen', () => {
    const v2 = '{"version":2,"levels":{"1.5":{"stars":2}},"notebook":["1.5"]}';
    expect(loadSave(memoryStore({ [SAVE_KEY]: v2 }))).toEqual({
      version: 4,
      levels: { '1.5': { stars: 2 } },
      notebook: ['1.5'],
      tutorialsSeen: [],
      codexRead: [],
      glossaryRead: [],
    });
  });

  it('writes a statement in the notebook once, keeping the order it was written in', () => {
    const notes = recordNotebook(recordNotebook(recordNotebook(emptySave(), '1.5'), '2.4'), '1.5');
    expect(notes.notebook).toEqual(['1.5', '2.4']);
  });

  it('a save of version 1 keeps all its progress, with an empty notebook', () => {
    const v1 = '{"version":1,"levels":{"0.1":{"stars":3},"1.2":{"stars":1}}}';
    expect(loadSave(memoryStore({ [SAVE_KEY]: v1 }))).toEqual({
      version: 4,
      levels: { '0.1': { stars: 3 }, '1.2': { stars: 1 } },
      notebook: [],
      tutorialsSeen: [],
      codexRead: [],
      glossaryRead: [],
    });
  });

  it('a damaged notebook is no excuse to lose the save: it starts afresh like any damage', () => {
    const bad = '{"version":3,"levels":{},"notebook":[7],"tutorialsSeen":[]}';
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
