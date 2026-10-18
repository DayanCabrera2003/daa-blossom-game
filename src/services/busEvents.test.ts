import { describe, expect, expectTypeOf, it } from 'vitest';
import { createBus } from './bus';
import type { BookRequest, BusEvents } from './busEvents';

describe('the events between the game and the overlays', () => {
  it('carries a book request, and the epilogue needs no payload', () => {
    const bus = createBus<BusEvents>();
    const requests: BookRequest[] = [];
    let epilogues = 0;
    bus.on('book.open', (request) => requests.push(request));
    bus.on('epilogue.open', () => (epilogues += 1));
    bus.emit('book.open', { book: 'codex', entry: 'C8' });
    bus.emit('epilogue.open');
    expect(requests).toEqual([{ book: 'codex', entry: 'C8' }]);
    expect(epilogues).toBe(1);
  });

  it('types each payload by its event', () => {
    expectTypeOf<BusEvents['overlay.changed']>().toEqualTypeOf<{ readonly open: boolean }>();
    expectTypeOf<BusEvents['sound']>().toEqualTypeOf<
      'bookOpen' | 'bookFlip' | 'bookClose' | 'click'
    >();
    expectTypeOf<BusEvents['capabilities']['sandbox']>().toEqualTypeOf<boolean>();
  });
});
