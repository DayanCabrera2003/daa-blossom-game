import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { chunkNotice, isChunkLoadError, type NetworkProbe } from '@services/chunkFailure';
import type { Translate } from '@services/i18n';
import type { PageNotice } from './pageNotice';

/** What the watcher needs: the bus, the locale, the page's notice, and how to look at the network. */
export interface LoadFailureOptions {
  readonly bus: Bus<BusEvents>;
  readonly t: Translate;
  readonly notice: PageNotice;
  /** Asks the network, after a failure, whether the page itself still answers. */
  readonly probe?: () => Promise<NetworkProbe>;
  /** Where the error is written for whoever debugs (the console by default). */
  readonly log?: (error: unknown) => void;
}

/**
 * The browser's own look at the network: whether it thinks itself online, and whether a fresh
 * request for the page (never from the cache) is answered.
 */
export async function probeNetwork(): Promise<NetworkProbe> {
  const online = navigator.onLine;
  const pageAnswered = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
    .then((response) => response.ok)
    .catch(() => false);
  return { online, pageAnswered };
}

/**
 * Turns a part that did not open (`load.failed` on the bus: a book, the share sheet, the credits,
 * the free mode) into a kind notice (plan 09, phase 10): offline, the notice names the part and asks
 * to check the connection; after a new version was published while the tab was open, it offers to
 * reload. The error is still written to the console; a bug in a part that did load is no notice
 * (`services/chunkFailure.ts`), and the game goes on either way.
 */
export function watchLoadFailures({
  bus,
  t,
  notice,
  probe = probeNetwork,
  log = (error) => console.error(error),
}: LoadFailureOptions): void {
  bus.on('load.failed', ({ part, error }) => {
    log(error);
    // A bug of a part that loaded needs no look at the network: it is no notice.
    if (!isChunkLoadError(error)) return;
    void probe()
      .catch((): NetworkProbe => ({ online: false, pageAnswered: false }))
      .then((network) => {
        const kind = chunkNotice(error, network);
        if (kind === 'offline')
          notice.show(t('notice.offline', { part: t(`notice.part.${part}`) }), false);
        if (kind === 'updated') notice.show(t('notice.updated'), true);
      });
  });
}
