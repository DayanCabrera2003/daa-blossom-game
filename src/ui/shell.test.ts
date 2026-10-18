import { createBus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { emptySave } from '@services/save';
import { createSaveStore } from '@services/saveStore';
import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../tests/support/memoryStore';
import { BOOKS_IMPORT_TIMEOUT } from '../../tests/support/timeouts';
import { mountShell, type BooksModule, type OverlayFrame, type OverlayRequest } from './shell';

/** The few parts of a DOM element the shell touches, open to inspection; tests run without a DOM. */
interface FakeElement {
  hidden: boolean;
  className: string;
  readonly style: Record<string, string>;
  readonly children: FakeElement[];
  appendChild(child: FakeElement): FakeElement;
  replaceChildren(): void;
  readonly ownerDocument: { createElement(tag: string): FakeElement };
}

const fakeElement = (): FakeElement => {
  const element: FakeElement = {
    hidden: false,
    className: '',
    style: {},
    children: [],
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    replaceChildren() {
      element.children.length = 0;
    },
    ownerDocument: { createElement: () => fakeElement() },
  };
  return element;
};

/** Mounts a shell on a fake page with a books module that records what it is asked to show. */
function setUp(load?: () => Promise<BooksModule>) {
  const bus = createBus<BusEvents>();
  const host = fakeElement();
  const shown: OverlayRequest[] = [];
  const frames: OverlayFrame[] = [];
  let loads = 0;
  const books: BooksModule = {
    show(request, frame) {
      shown.push(request);
      frames.push(frame);
    },
  };
  const overlay: boolean[] = [];
  bus.on('overlay.changed', ({ open }) => overlay.push(open));
  mountShell({
    bus,
    saves: createSaveStore(memoryStore()),
    codexOpen: () => new Map([['C1', new Set(['intuition'] as const)]]),
    host: host as unknown as HTMLElement,
    load:
      load ??
      (() => {
        loads += 1;
        return Promise.resolve(books);
      }),
  });
  const layer = host.children[0];
  return { bus, layer, shown, frames, overlay, loads: () => loads };
}

/** Lets pending promise callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('overlay shell', () => {
  it('adds a hidden layer over the canvas and loads nothing until a book is asked for', () => {
    const { layer, loads } = setUp();
    expect(layer?.hidden).toBe(true);
    expect(loads()).toBe(0);
  });

  it('opening a book shows the layer, says so, and loads the books once', async () => {
    const { bus, layer, shown, overlay, loads } = setUp();
    bus.emit('book.open', { book: 'codex', entry: 'C3' });
    expect(layer?.hidden).toBe(false);
    expect(overlay).toEqual([true]);
    await settle();
    bus.emit('book.open', { book: 'notebook' });
    await settle();
    expect(loads()).toBe(1);
    expect(overlay).toEqual([true]);
    expect(shown).toEqual([
      { kind: 'book', book: { book: 'codex', entry: 'C3' } },
      { kind: 'book', book: { book: 'notebook' } },
    ]);
  });

  it('the epilogue opens in the same layer', async () => {
    const { bus, shown } = setUp();
    bus.emit('epilogue.open');
    await settle();
    expect(shown).toEqual([{ kind: 'epilogue' }]);
  });

  it('closing hides and empties the layer and gives the input back, once', async () => {
    const { bus, layer, frames, overlay } = setUp();
    bus.emit('book.open', { book: 'codex' });
    await settle();
    layer?.children.push(fakeElement());
    frames[0]?.close();
    frames[0]?.close();
    expect(layer?.hidden).toBe(true);
    expect(layer?.children).toHaveLength(0);
    expect(overlay).toEqual([true, false]);
  });

  it('a books chunk that fails to load closes the layer and is tried again next time', async () => {
    let attempts = 0;
    const original = console.error;
    console.error = () => undefined;
    try {
      const { bus, layer, overlay } = setUp(() => {
        attempts += 1;
        return Promise.reject(new Error('offline'));
      });
      bus.emit('book.open', { book: 'codex' });
      await settle();
      expect(layer?.hidden).toBe(true);
      expect(overlay).toEqual([true, false]);
      bus.emit('book.open', { book: 'codex' });
      await settle();
      expect(attempts).toBe(2);
    } finally {
      console.error = original;
    }
  });

  it('a book that fails to show closes the layer', async () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      const { bus, layer, overlay } = setUp(() =>
        Promise.resolve({
          show: () => {
            throw new Error('broken page');
          },
        }),
      );
      bus.emit('book.open', { book: 'notebook' });
      await settle();
      expect(layer?.hidden).toBe(true);
      expect(overlay).toEqual([true, false]);
    } finally {
      console.error = original;
    }
  });

  it('hands the books what the Codex has open for a progress', async () => {
    const { bus, frames } = setUp();
    bus.emit('book.open', { book: 'codex' });
    await settle();
    expect([...(frames[0]?.codexOpen(emptySave()).keys() ?? [])]).toEqual(['C1']);
  });

  it('tells the books what the game last announced it can do, nothing before it speaks', async () => {
    const { bus, frames } = setUp();
    bus.emit('epilogue.open');
    await settle();
    expect(frames[0]?.capabilities()).toEqual({ sandbox: false });
    bus.emit('capabilities', { sandbox: true });
    expect(frames[0]?.capabilities()).toEqual({ sandbox: true });
  });

  it(
    'the books not written yet close at once, so the game never stays without input',
    async () => {
      const bus = createBus<BusEvents>();
      const overlay: boolean[] = [];
      bus.on('overlay.changed', ({ open }) => overlay.push(open));
      mountShell({
        bus,
        saves: createSaveStore(memoryStore()),
        codexOpen: () => new Map(),
        host: fakeElement() as unknown as HTMLElement,
      });
      bus.emit('book.open', { book: 'notebook' });
      await vi.waitFor(() => expect(overlay).toEqual([true, false]), {
        timeout: BOOKS_IMPORT_TIMEOUT,
      });
    },
    BOOKS_IMPORT_TIMEOUT,
  );
});
