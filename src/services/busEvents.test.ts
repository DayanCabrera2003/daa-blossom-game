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
    expectTypeOf<BusEvents['sandbox.open']>().toEqualTypeOf<undefined>();
    expectTypeOf<BusEvents['load.failed']['part']>().toEqualTypeOf<
      'books' | 'share' | 'credits' | 'sandbox'
    >();
    expectTypeOf<BusEvents['teacher.feed']['cursor']>().toEqualTypeOf<number>();
    expectTypeOf<BusEvents['teacher.leave']>().toEqualTypeOf<undefined>();
    expectTypeOf<BusEvents['teacher.toggle']>().toEqualTypeOf<undefined>();
    expectTypeOf<BusEvents['teacher.panel']>().toEqualTypeOf<{ readonly open: boolean }>();
    expectTypeOf<BusEvents['teacher.sun']>().toEqualTypeOf<{ readonly step: number }>();
    expectTypeOf<BusEvents['sandbox.share']['code']>().toEqualTypeOf<string | null>();
    expectTypeOf<BusEvents['sandbox.share']['json']>().toEqualTypeOf<string | null>();
    expectTypeOf<BusEvents['sandbox.imported']>().toEqualTypeOf<{ readonly text: string }>();
    expectTypeOf<BusEvents['sandbox.importAnswer']['ok']>().toEqualTypeOf<boolean>();
  });

  it('carries a text opened in the share sheet as it was written, and the answer back', () => {
    const bus = createBus<BusEvents>();
    const answers: BusEvents['sandbox.importAnswer'][] = [];
    bus.on('sandbox.importAnswer', (answer) => answers.push(answer));
    // The game reads the text and answers at once, before `emit` returns.
    bus.on('sandbox.imported', ({ text }) =>
      bus.emit(
        'sandbox.importAnswer',
        text === 'AQRA' ? { ok: true } : { ok: false, reason: 'badCode' },
      ),
    );
    bus.emit('sandbox.imported', { text: '  {"id": ' });
    bus.emit('sandbox.imported', { text: 'AQRA' });
    expect(answers).toEqual([{ ok: false, reason: 'badCode' }, { ok: true }]);
  });
});
