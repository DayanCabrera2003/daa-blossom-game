import type { OverlayFrame } from './shell';

/**
 * The frame every book shares (plan 07, phase 3): a dimmed backdrop over the canvas with the book
 * in the middle, a modal dialog for assistive technology, the keyboard focus kept inside it while it
 * is open, and three ways out that work the same in every book: Escape, the book's close button
 * and a press on the backdrop around the book. Closing plays the sound of a closing book and gives
 * the input back to the game through the shell.
 */

/** A book's frame, once open. */
export interface Overlay {
  /** The book's own element, inside the backdrop: the book draws into it. */
  readonly book: HTMLElement;
  /** Closes the book; closing twice does nothing more. */
  close(): void;
}

/** What can take the keyboard focus inside the book, in the order Tab visits it. */
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Opens a book's frame in the shell's layer, replacing whatever was shown there, labelled `label`
 * for screen readers, with `className` on the book's element for its stylesheet.
 */
export function openOverlay(frame: OverlayFrame, label: string, className: string): Overlay {
  const page = frame.layer.ownerDocument;
  const backdrop = page.createElement('div');
  backdrop.className = 'book-backdrop';
  const book = page.createElement('section');
  book.className = `book ${className}`;
  book.setAttribute('role', 'dialog');
  book.setAttribute('aria-modal', 'true');
  book.setAttribute('aria-label', label);
  book.tabIndex = -1;
  backdrop.appendChild(book);
  frame.layer.replaceChildren(backdrop);

  let open = true;
  const close = (): void => {
    if (!open) return;
    open = false;
    frame.bus.emit('sound', 'bookClose');
    frame.close();
  };

  // A press on the backdrop, outside the book, closes it like the button.
  backdrop.addEventListener('pointerdown', (event) => {
    if (event.target === backdrop) close();
  });
  book.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Closing gives the keys back to the game at once: this Escape must not reach it too (it
      // would leave the level).
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      keepFocusInside(book, event);
    }
  });
  frame.bus.emit('sound', 'bookOpen');
  book.focus();
  return { book, close };
}

/** Moves the focus round from the last focusable element to the first, and back with Shift. */
function keepFocusInside(book: HTMLElement, event: KeyboardEvent): void {
  const focusable = [...book.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) {
    event.preventDefault();
    return;
  }
  const active = book.ownerDocument.activeElement;
  if (event.shiftKey && (active === first || active === book)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
