import { describe, expect, it, vi } from 'vitest';
import strings from '@content/es/strings.json';
import { createBus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import type { NetworkProbe } from '@services/chunkFailure';
import { createTranslator } from '@services/i18n';
import { watchLoadFailures } from './loadFailures';

const t = createTranslator(strings);
const MISSING = new TypeError('Failed to fetch dynamically imported module: https://x/books.js');

/** The watcher on a bus, with a notice that records what it is asked to say. */
function watching(probe: NetworkProbe) {
  const bus = createBus<BusEvents>();
  const shown: { text: string; reload: boolean }[] = [];
  const logged: unknown[] = [];
  watchLoadFailures({
    bus,
    t,
    notice: { show: (text, reload) => shown.push({ text, reload }), hide: () => undefined },
    probe: () => Promise.resolve(probe),
    log: (error) => logged.push(error),
  });
  return { bus, shown, logged };
}

describe('the parts that fail to load', () => {
  it('offline, the notice names the part and asks to check the connection', async () => {
    const { bus, shown, logged } = watching({ online: false, pageAnswered: false });
    bus.emit('load.failed', { part: 'books', error: MISSING });
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0]).toEqual({
      text: t('notice.offline', { part: t('notice.part.books') }),
      reload: false,
    });
    expect(logged).toEqual([MISSING]);
  });

  it('after a new version was published, the notice offers to reload', async () => {
    const { bus, shown } = watching({ online: true, pageAnswered: true });
    bus.emit('load.failed', { part: 'credits', error: MISSING });
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0]).toEqual({ text: t('notice.updated'), reload: true });
  });

  it('a bug of a part that loaded stays in the console, with no notice', async () => {
    const { bus, shown, logged } = watching({ online: true, pageAnswered: true });
    const bug = new Error('a broken page of a book');
    bus.emit('load.failed', { part: 'sandbox', error: bug });
    await Promise.resolve();
    await Promise.resolve();
    expect(shown).toEqual([]);
    expect(logged).toEqual([bug]);
  });

  it('a probe that fails itself counts as offline', async () => {
    const bus = createBus<BusEvents>();
    const shown: string[] = [];
    watchLoadFailures({
      bus,
      t,
      notice: { show: (text) => shown.push(text), hide: () => undefined },
      probe: () => Promise.reject(new Error('no network')),
      log: () => undefined,
    });
    bus.emit('load.failed', { part: 'share', error: MISSING });
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    expect(shown[0]).toBe(t('notice.offline', { part: t('notice.part.share') }));
  });
});
