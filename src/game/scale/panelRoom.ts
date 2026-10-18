import { CANVAS_WIDTH, integerZoom } from './integerZoom';

/**
 * How the window is shared between the canvas and the teacher's trace panel at its right (GDD
 * §5.8; plan 07, phase 13), so the open panel never covers a sprout of the garden: the canvas keeps
 * the largest whole zoom that still leaves the panel its narrowest width, and the panel takes the
 * room left beside it, up to its widest. Folded, the canvas has the whole window again. Widths are
 * in CSS pixels.
 */
export const PANEL_WIDTH = { min: 320, max: 560 } as const;

/** The canvas's whole zoom and the panel's width (0 when folded). */
export interface PanelRoom {
  readonly zoom: number;
  readonly panel: number;
}

/** The room for a window of `width` × `height`, with the panel `open` or folded. */
export function panelRoom(width: number, height: number, open: boolean): PanelRoom {
  if (!open) return { zoom: integerZoom(width, height), panel: 0 };
  const zoom = integerZoom(width - PANEL_WIDTH.min, height);
  const left = width - zoom * CANVAS_WIDTH;
  return { zoom, panel: Math.max(PANEL_WIDTH.min, Math.min(PANEL_WIDTH.max, left)) };
}
