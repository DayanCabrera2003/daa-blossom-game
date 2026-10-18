import type { OpenTabs } from '@levels/codex';
import type { Bus } from '@services/bus';
import type { BookRequest, BusEvents, Capabilities, ShareRequest } from '@services/busEvents';
import type { LazyPart } from '@services/chunkFailure';
import type { SaveData } from '@services/save';
import type { SaveStore } from '@services/saveStore';
import { afterClose, afterShow } from '@ui/model/overlayStack';

/**
 * What the layer is asked to show: a book (Códex or Cuaderno), the epilogue, or the free mode's
 * share sheet with the garden it shares.
 */
export type OverlayRequest =
  | { readonly kind: 'book'; readonly book: BookRequest }
  | { readonly kind: 'epilogue' }
  | { readonly kind: 'share'; readonly share: ShareRequest };

/** What the books chunk shows: anything but the share sheet. */
export type BookOverlay = Exclude<OverlayRequest, { readonly kind: 'share' }>;

/**
 * What the Codex has open for a progress: the pages its completed levels opened, or all of them in
 * teacher mode (`services/codexProgress.ts`, bound by `main.ts` to the catalog and the mode).
 */
export type CodexOpen = (save: SaveData) => OpenTabs;

/** What the books get from the shell: their layer, the bus, the shared save, and how to close. */
export interface OverlayFrame {
  /** The element over the canvas the books draw into; the shell empties it on closing. */
  readonly layer: HTMLElement;
  readonly bus: Bus<BusEvents>;
  readonly saves: SaveStore;
  readonly codexOpen: CodexOpen;
  /**
   * What the game last announced it can do (`capabilities` on the bus), so a page only offers what
   * exists; until the game speaks, nothing optional (no free mode).
   */
  capabilities(): Capabilities;
  /** Hides the layer and gives the input back to the game; closing twice does nothing more. */
  close(): void;
}

/**
 * The heavy part of the overlays (the books, KaTeX, marked, the entries), in its own chunk. The
 * type lives here, not in that chunk, so the shell names it without importing it.
 */
export interface BooksModule {
  /** Shows `request` in `frame.layer`, whether or not something is already open there. */
  show(request: BookOverlay, frame: OverlayFrame): void;
}

/**
 * The free mode's share sheet (plan 08, phase 14), in a chunk of its own: light, and only wanted
 * by whoever shares a garden, so it never waits on the books. Its type lives here, like theirs.
 */
export interface ShareModule {
  /** Shows the sheet for the garden of `request` in `frame.layer`. */
  showShare(request: ShareRequest, frame: OverlayFrame): void;
}

/** What `mountShell` needs; `load` stands in for the chunk in tests. */
export interface ShellOptions {
  readonly bus: Bus<BusEvents>;
  readonly saves: SaveStore;
  readonly codexOpen: CodexOpen;
  /** The element the layer is added to, over the canvas (the page body). */
  readonly host: HTMLElement;
  /** Loads the books chunk; by default with import(), so the books stay out of the initial script. */
  readonly load?: () => Promise<BooksModule>;
  /** Loads the share sheet's chunk; by default with import(), like the books. */
  readonly loadShare?: () => Promise<ShareModule>;
}

/**
 * Mounts the light shell of the DOM overlays: an empty layer over the canvas, hidden until a book,
 * the epilogue or the share sheet is asked for on the bus. The first request loads the books chunk
 * (or, for the share sheet, its own); the layer shows at once and `overlay.changed` tells the game to stop taking input until the books close it. A chunk
 * that fails to load (offline, or gone after a new version), or a book that fails to show, closes
 * the layer again and is told on the bus (`load.failed`); the chunk is asked for anew on the next
 * request. Closing a book opened from the epilogue shows the epilogue
 * again, without giving the input back in between.
 */
export function mountShell({
  bus,
  saves,
  codexOpen,
  host,
  load = () => import('./books'),
  loadShare = () => import('./sandbox/ShareSheet'),
}: ShellOptions): void {
  const layer = host.ownerDocument.createElement('div');
  layer.className = 'overlay-layer';
  layer.hidden = true;
  // Over the whole window, above the canvas; the books lay themselves out inside.
  Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '10' });
  host.appendChild(layer);

  let books: Promise<BooksModule> | null = null;
  let sheet: Promise<ShareModule> | null = null;
  // What the layer shows, from the bottom up (`ui/model/overlayStack.ts`); only the top is drawn.
  let stack: readonly OverlayRequest[] = [];
  // Listened to from the start, so an announcement made before any book opens is not lost.
  let capable: Capabilities = { sandbox: false, credits: false };
  bus.on('capabilities', (announced) => (capable = announced));

  /** Hides and empties the layer and gives the input back, whatever it was showing. */
  const hide = (): void => {
    if (stack.length === 0) return;
    stack = [];
    layer.hidden = true;
    layer.replaceChildren();
    bus.emit('overlay.changed', { open: false });
  };
  /** Closes what is on top: the layer shows what lay under it, or hides when nothing did. */
  const close = (): void => {
    const rest = afterClose(stack);
    const under = rest.at(-1);
    // Closing the last thing shown hides the layer (and closing twice does nothing more).
    if (under === undefined) {
      hide();
      return;
    }
    stack = rest;
    draw(under);
  };
  const frame: OverlayFrame = {
    layer,
    bus,
    saves,
    codexOpen,
    capabilities: () => capable,
    close,
  };

  /**
   * A book, or the sheet, that failed: tell the page (`load.failed`, which writes it to the console
   * and says kindly what to do when the chunk did not arrive) and give the input back.
   */
  const failed = (part: LazyPart, error: unknown): void => {
    // A broken book never breaks the garden.
    bus.emit('load.failed', { part, error });
    hide();
  };

  /** Draws `request` in the layer, loading its chunk the first time. */
  const draw = (request: OverlayRequest): void => {
    if (request.kind === 'share') {
      sheet ??= loadShare();
      sheet
        .then((module) => module.showShare(request.share, frame))
        .catch((error: unknown) => {
          sheet = null;
          failed('share', error);
        });
      return;
    }
    books ??= load();
    books
      .then((module) => module.show(request, frame))
      .catch((error: unknown) => {
        books = null;
        failed('books', error);
      });
  };

  const show = (request: OverlayRequest): void => {
    if (stack.length === 0) {
      layer.hidden = false;
      bus.emit('overlay.changed', { open: true });
    }
    stack = afterShow(stack, request);
    draw(request);
  };

  bus.on('book.open', (book) => show({ kind: 'book', book }));
  bus.on('epilogue.open', () => show({ kind: 'epilogue' }));
  bus.on('sandbox.share', (share) => show({ kind: 'share', share }));
}
