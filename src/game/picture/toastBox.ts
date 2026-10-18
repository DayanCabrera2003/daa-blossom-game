import type { PixelRect } from '../assets/frames';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { PANEL } from './panelLayout';

/**
 * A toast's measures: where its text wraps (a panel and a border short of the canvas's edges) and
 * where its wooden panel ends: by default above the toolbar, as the dialogue box does, or a little
 * above a drawer that covers it.
 */
export const TOAST = {
  wrap: CANVAS_WIDTH - 4 * PANEL.pad,
  bottom: CANVAS_HEIGHT - 29,
  /** The air between a toast and the top of a drawer it sits above. */
  aboveDrawer: 2,
  /** Over the garden and the panels of the HUD, under the dialogue box. */
  depth: 150,
} as const;

/** The wooden panel of a toast, and the middle of its text. */
export interface ToastBox extends PixelRect {
  readonly textY: number;
}

/**
 * The panel round a message of `width` × `height` pixels, centred across the canvas and ending at
 * `bottom`: a message that wraps grows upwards, never over the toolbar (or the drawer it sits
 * above). Pure: the toast measures its text and draws where this says.
 */
export function toastBox(width: number, height: number, bottom: number = TOAST.bottom): ToastBox {
  const w = Math.round(width) + 2 * PANEL.pad;
  const h = Math.round(height) + 2 * PANEL.pad - 4;
  const y = bottom - h;
  return { x: Math.round((CANVAS_WIDTH - w) / 2), y, width: w, height: h, textY: y + h / 2 };
}
