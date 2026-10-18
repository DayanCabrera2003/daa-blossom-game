/** What the notice needs: the page element to put it in, and its words (from the locale). */
export interface RotateNoticeOptions {
  readonly host: HTMLElement;
  readonly text: string;
}

/** The notice once on the page: shown or put out of sight as the window turns. */
export interface RotateNotice {
  show(shown: boolean): void;
}

/**
 * The look of the notice: over the whole window and above everything (the books' layer is at 10),
 * the game's darkest ink as its ground and its paper as its letters (`game/view/palette.ts`), in
 * the pixel font at twice its native size.
 */
const LOOK: Readonly<Record<string, string>> = {
  position: 'fixed',
  inset: '0',
  zIndex: '20',
  placeItems: 'center',
  padding: '16px',
  textAlign: 'center',
  background: '#141b1b',
  color: '#f2eaf1',
  fontFamily: 'monogram, monospace',
  fontSize: '32px',
  lineHeight: '26px',
};

/**
 * Mounts the notice "gira el teléfono" (plan 09, phase 7; the author's answer to question 17 of
 * appendix A): out of sight until the page shows it over the game when a phone is held upright
 * (`game/scale/orientation.ts` decides), so the game is not played until the phone is turned. It
 * cannot be closed: it goes by itself once the phone is turned. A screen reader reads it as a
 * status.
 */
export function mountRotateNotice({ host, text }: RotateNoticeOptions): RotateNotice {
  const layer = host.ownerDocument.createElement('div');
  layer.setAttribute('role', 'status');
  layer.textContent = text;
  Object.assign(layer.style, LOOK, { display: 'none' });
  host.appendChild(layer);
  return {
    show(shown) {
      layer.style.display = shown ? 'grid' : 'none';
    },
  };
}
