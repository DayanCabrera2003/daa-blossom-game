import { CANVAS_WIDTH, cssPixel, integerZoom, MIN_CSS_PIXEL } from './integerZoom';

/**
 * How the window is shared between the canvas and the teacher's trace panel at its right (GDD
 * §5.8; plan 07, phase 13), so the open panel never covers a sprout of the garden: the canvas keeps
 * the largest whole zoom that still leaves the panel its narrowest width, and the panel takes the
 * room left beside it, up to its widest. Folded, the canvas has the whole window again. Widths are
 * in CSS pixels; the zoom is in device pixels (`integerZoom`, plan 09, phase 7). A window too small
 * for both (a phone, a narrow window) does not offer the panel: the canvas keeps the whole window,
 * since beside the panel it would be smaller than the game at ×1.
 */
export const PANEL_WIDTH = { min: 320, max: 560 } as const;

/**
 * The canvas's whole zoom (device pixels per logical pixel), the panel's width in CSS pixels (0 when
 * folded or not offered), and whether an open panel fits beside the canvas (true when folded).
 */
export interface PanelRoom {
  readonly zoom: number;
  readonly panel: number;
  readonly fits: boolean;
}

/**
 * The room for a window of `width` × `height` CSS pixels at `density` device pixels per CSS pixel,
 * with the panel `open` or folded.
 */
export function panelRoom(width: number, height: number, open: boolean, density = 1): PanelRoom {
  const folded = { zoom: integerZoom(width, height, density), panel: 0, fits: !open };
  if (!open) return folded;
  const zoom = integerZoom(width - PANEL_WIDTH.min, height, density);
  const canvas = cssPixel(zoom, density);
  const left = width - canvas * CANVAS_WIDTH;
  if (canvas < MIN_CSS_PIXEL || left < PANEL_WIDTH.min) return folded;
  return { zoom, panel: Math.max(PANEL_WIDTH.min, Math.min(PANEL_WIDTH.max, left)), fits: true };
}

/**
 * The fewest characters of the pixel font (6 font pixels wide each) a line of the panel holds,
 * inside its padding and its wooden edge (11 font pixels in all, `ui/teacher/teacher.css`).
 */
export const PANEL_LINE = 24;
/** The font pixels the panel's padding and edge take from each line. */
const PANEL_EDGES = 11;
/** The width of a character of the pixel font, in font pixels. */
const ADVANCE = 6;

/**
 * The panel's pixel, in screen pixels, for a canvas at `zoom` and a panel `panel` wide: the books'
 * (the canvas's zoom), so its words read at the size of theirs, or a step smaller while a line
 * would hold fewer than `PANEL_LINE` characters; never under one screen pixel.
 */
export function panelUnit(zoom: number, panel: number): number {
  let unit = zoom;
  while (unit > 1 && (panel - PANEL_EDGES * unit) / (ADVANCE * unit) < PANEL_LINE) unit -= 1;
  return Math.max(1, unit);
}
