/** What the notice needs: the page element to put it in, its buttons' words, and how to reload. */
export interface PageNoticeOptions {
  readonly host: HTMLElement;
  /** The words of its buttons, from the locale. */
  readonly words: { readonly close: string; readonly reload: string };
  /** Reloads the page (the browser's own reload; a stand-in in tests). */
  readonly reload: () => void;
}

/** The notice once on the page. */
export interface PageNotice {
  /** Shows `text`, with a button to reload the page when `offerReload`; replaces what it showed. */
  show(text: string, offerReload: boolean): void;
  /** Puts it out of sight. */
  hide(): void;
}

/**
 * The look of the notice: a dark box with the pack's purple edge at the top of the window, over the
 * canvas and the books' layer (10) but under the notice to turn the phone (20), its letters the
 * game's paper in the pixel font at the canvas's pixel (`--zoom`, set by the page). The colours are
 * the palette's (`game/view/palette.ts`: background, panelEdge, label, button, ink).
 */
const BOX: Readonly<Record<string, string>> = {
  position: 'fixed',
  top: 'calc(8px * var(--zoom, 1))',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: '15',
  boxSizing: 'border-box',
  maxWidth: 'min(calc(100vw - 32px), calc(400px * var(--zoom, 1)))',
  padding: 'calc(6px * var(--zoom, 1)) calc(8px * var(--zoom, 1))',
  background: '#141b1b',
  border: 'calc(1px * var(--zoom, 1)) solid #543c52',
  color: '#f2eaf1',
  fontFamily: 'monogram, monospace',
  fontSize: 'calc(16px * var(--zoom, 1))',
  lineHeight: 'calc(12px * var(--zoom, 1))',
  textAlign: 'center',
};

/** A button of the notice: light wood with dark letters, as the game's buttons at rest. */
const BUTTON: Readonly<Record<string, string>> = {
  margin: 'calc(4px * var(--zoom, 1)) calc(3px * var(--zoom, 1)) 0',
  padding: '0 calc(3px * var(--zoom, 1))',
  background: '#bd7959',
  color: '#141b1b',
  border: 'calc(1px * var(--zoom, 1)) solid #543c52',
  font: 'inherit',
  lineHeight: 'inherit',
  cursor: 'pointer',
};

/**
 * Mounts the page's notice (plan 09, phase 10): out of sight until the page has something to say
 * that the game cannot (a part that did not load, a browser that will not store), then a small box
 * at the top of the window that a screen reader reads at once, with "Cerrar" and, when reloading
 * helps, "Recargar". Its words come from the locale; it never covers the whole game.
 */
export function mountPageNotice({ host, words, reload }: PageNoticeOptions): PageNotice {
  const document = host.ownerDocument;
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  Object.assign(box.style, BOX, { display: 'none' });
  const text = document.createElement('p');
  Object.assign(text.style, { margin: '0' });
  const button = (label: string, press: () => void): HTMLButtonElement => {
    const made = document.createElement('button');
    made.type = 'button';
    made.textContent = label;
    Object.assign(made.style, BUTTON);
    made.addEventListener('click', press);
    return made;
  };
  const reloadButton = button(words.reload, reload);
  const closeButton = button(words.close, () => hide());
  box.append(text, reloadButton, closeButton);
  host.appendChild(box);

  function hide(): void {
    box.style.display = 'none';
  }
  return {
    show(said, offerReload) {
      text.textContent = said;
      reloadButton.style.display = offerReload ? '' : 'none';
      box.style.display = 'block';
    },
    hide,
  };
}
