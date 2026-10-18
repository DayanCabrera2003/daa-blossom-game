import type { Rect } from './boxDistance';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { LINE_HEIGHT } from './textWrap';
import { WOOD_PANEL, type WoodPiece } from './wood';

/**
 * The card of the keys (plan 09, phase 4), opened from the settings panel: its title, one line for
 * each thing the keys do on the screen it was opened from (`input/keyBindings.ts`), a last line
 * saying the garden is played with the pointer or a finger, and "Cerrar", in the wood of the other
 * panels. Pure: the view draws what this says; the tests check that every line fits on its row and
 * the card stays on the canvas.
 */
export const KEYS_CARD: {
  readonly width: number;
  readonly pad: number;
  readonly frame: WoodPiece;
} = {
  width: 300,
  /** Clear space inside the card's edges. */
  pad: 8,
  /** The wood the card is drawn in. */
  frame: WOOD_PANEL,
};

/** Where the card goes and the top of each of its rows, from the card's top. */
export interface KeysCardLayout {
  readonly panel: Rect;
  readonly title: number;
  readonly lines: readonly number[];
  /** The top of the label of "Cerrar" (its wood starts a pixel higher). */
  readonly close: number;
}

/** The card for `count` lines and a button `buttonHeight` tall, centred on the canvas. */
export function keysCardLayout(count: number, buttonHeight: number): KeysCardLayout {
  const { pad, width } = KEYS_CARD;
  const title = pad - 2;
  const first = title + LINE_HEIGHT + 4;
  const lines = Array.from({ length: count }, (_, i) => first + i * LINE_HEIGHT);
  const close = first + count * LINE_HEIGHT + 4;
  // A button's wood starts a pixel above its label and ends a pixel above the label's line.
  const height = close + buttonHeight - 2 + pad;
  const panel = {
    x: (CANVAS_WIDTH - width) / 2,
    y: Math.round((CANVAS_HEIGHT - height) / 2),
    width,
    height,
  };
  return { panel, title, lines, close };
}
