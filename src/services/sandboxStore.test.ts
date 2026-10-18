import { describe, expect, it } from 'vitest';
import { EMPTY_DESIGN, type Design } from '@levels/sandbox/design';
import { memoryStore } from '../../tests/support/memoryStore';
import { SAVE_KEY } from './save';
import { createSandboxStore, SANDBOX_KEY } from './sandboxStore';

/** A small design: a bee and a flower joined by a lit vine, and a third sprout apart. */
const DESIGN: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100, kind: 'bee' },
    { label: 'B', x: 140, y: 100, kind: 'flower' },
    { label: 'C', x: 180, y: 140 },
  ],
  vines: [['A', 'B']],
  lanterns: [['A', 'B']],
};

/** The store's text for `design`, as it writes it. */
const stored = (design: unknown): string => JSON.stringify({ version: 1, design });

describe('the last garden designed in the free mode', () => {
  it('starts empty when nothing was kept', () => {
    expect(createSandboxStore(memoryStore()).get()).toEqual(EMPTY_DESIGN);
  });

  it('keeps a design at its own key and reads it back in a later session', () => {
    const storage = memoryStore();
    createSandboxStore(storage).set(DESIGN);
    expect(storage.data.has(SANDBOX_KEY)).toBe(true);
    expect(createSandboxStore(storage).get()).toEqual(DESIGN);
  });

  it('never touches the progress', () => {
    const storage = memoryStore({ [SAVE_KEY]: 'the progress' });
    createSandboxStore(storage).set(DESIGN);
    expect([...storage.data.keys()].sort()).toEqual([SANDBOX_KEY, SAVE_KEY].sort());
    expect(storage.data.get(SAVE_KEY)).toBe('the progress');
  });

  it('gives the empty design for anything broken it finds', () => {
    const broken = [
      'not json',
      JSON.stringify({ version: 2, design: DESIGN }),
      stored({ ...DESIGN, extra: 1 }),
      stored({ sprouts: [{ label: 'A', x: 'far', y: 0 }], vines: [], lanterns: [] }),
      stored({ sprouts: [{ label: 'A', x: 1, y: 1, kind: 'wasp' }], vines: [], lanterns: [] }),
      // A vine or a lantern between sprouts the design does not have.
      stored({ ...DESIGN, vines: [['A', 'Z']] }),
      stored({ ...DESIGN, lanterns: [['C', 'Q']] }),
      // Two sprouts with one name.
      stored({ ...DESIGN, sprouts: [...DESIGN.sprouts, { label: 'A', x: 0, y: 0 }] }),
    ];
    for (const text of broken) {
      expect(createSandboxStore(memoryStore({ [SANDBOX_KEY]: text })).get()).toEqual(EMPTY_DESIGN);
    }
  });

  it('keeps the design for this session when the browser refuses to store it', () => {
    const refusing = {
      getItem: () => {
        throw new Error('storage refused');
      },
      setItem: () => {
        throw new Error('storage refused');
      },
    };
    const store = createSandboxStore(refusing);
    expect(store.get()).toEqual(EMPTY_DESIGN);
    store.set(DESIGN);
    expect(store.get()).toEqual(DESIGN);
  });
});
