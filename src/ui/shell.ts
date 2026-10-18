import type { Bus } from '@services/bus';
import type { BookRequest, BusEvents } from '@services/busEvents';
import type { SaveStore } from '@services/saveStore';

/** What the layer is asked to show: a book (Códex or Cuaderno), or the epilogue. */
export type OverlayRequest =
  { readonly kind: 'book'; readonly book: BookRequest } | { readonly kind: 'epilogue' };

/** What the books get from the shell: their layer, the bus, the shared save, and how to close. */
export interface OverlayFrame {
  /** The element over the canvas the books draw into; the shell empties it on closing. */
  readonly layer: HTMLElement;
  readonly bus: Bus<BusEvents>;
  readonly saves: SaveStore;
  /** Hides the layer and gives the input back to the game; closing twice does nothing more. */
  close(): void;
}

/**
 * The heavy part of the overlays (the books, KaTeX, marked, the entries), in its own chunk. The
 * type lives here, not in that chunk, so the shell names it without importing it.
 */
export interface BooksModule {
  /** Shows `request` in `frame.layer`, whether or not something is already open there. */
  show(request: OverlayRequest, frame: OverlayFrame): void;
}

/** What `mountShell` needs; `load` stands in for the chunk in tests. */
export interface ShellOptions {
  readonly bus: Bus<BusEvents>;
  readonly saves: SaveStore;
  /** The element the layer is added to, over the canvas (the page body). */
  readonly host: HTMLElement;
  /** Loads the books chunk; by default with import(), so the books stay out of the initial script. */
  readonly load?: () => Promise<BooksModule>;
}

/**
 * Mounts the light shell of the DOM overlays: an empty layer over the canvas, hidden until a book or
 * the epilogue is asked for on the bus. The first request loads the books chunk; the layer shows at
 * once and `overlay.changed` tells the game to stop taking input until the books close it. A chunk
 * that fails to load (offline), or a book that fails to show, closes the layer again; the chunk is
 * asked for anew on the next request.
 */
export function mountShell({
  bus,
  saves,
  host,
  load = () => import('./books'),
}: ShellOptions): void {
  const layer = host.ownerDocument.createElement('div');
  layer.className = 'overlay-layer';
  layer.hidden = true;
  // Over the whole window, above the canvas; the books lay themselves out inside.
  Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '10' });
  host.appendChild(layer);

  let books: Promise<BooksModule> | null = null;
  let open = false;

  const close = (): void => {
    if (!open) return;
    open = false;
    layer.hidden = true;
    layer.replaceChildren();
    bus.emit('overlay.changed', { open: false });
  };
  const frame: OverlayFrame = { layer, bus, saves, close };

  const show = (request: OverlayRequest): void => {
    if (!open) {
      open = true;
      layer.hidden = false;
      bus.emit('overlay.changed', { open: true });
    }
    books ??= load();
    books
      .then((module) => module.show(request, frame))
      .catch((error: unknown) => {
        // A broken book never breaks the garden: report it and give the input back.
        books = null;
        console.error(error);
        close();
      });
  };

  bus.on('book.open', (book) => show({ kind: 'book', book }));
  bus.on('epilogue.open', () => show({ kind: 'epilogue' }));
}
