import { CANVAS_HEIGHT, CANVAS_WIDTH, cssPixel } from './integerZoom';
import { asksToTurn } from './orientation';
import { panelPixel, panelRoom } from './panelRoom';
import type { ViewportSize } from './viewport';

/**
 * Everything the page lays out round the game for a window, in one decision: the canvas's whole
 * zoom in device pixels and its logical pixel in CSS pixels (`--zoom`), the canvas's size in CSS
 * pixels, whether the notice asks to turn the phone, and the teacher's panel's width in CSS pixels
 * (0 when folded or not offered), its pixel (`--teacher-unit`) and whether an open panel fits.
 */
export interface ScreenLayout {
  readonly zoom: number;
  readonly pixel: number;
  readonly canvas: ViewportSize;
  readonly turn: boolean;
  readonly panel: number;
  readonly panelPixel: number;
  readonly fits: boolean;
}

/**
 * The layout for a window of `viewport` CSS pixels (`viewportSize`) at `density` device pixels per
 * CSS pixel, with the teacher's panel `panelOpen` or folded (plan 09, phase 7). It depends only on
 * the window as it is now, never on the layout before, so the page decides it again on every
 * change of the window (a phone turned either way, a window resized, a change of density) and
 * comes out as if it had started there. The canvas never comes out wider or taller than a window
 * that holds it at ×1 in CSS pixels.
 */
export function screenLayout(
  viewport: ViewportSize,
  density: number,
  panelOpen: boolean,
): ScreenLayout {
  const { width, height } = viewport;
  const room = panelRoom(width, height, panelOpen, density);
  const pixel = cssPixel(room.zoom, density);
  return {
    zoom: room.zoom,
    pixel,
    canvas: { width: CANVAS_WIDTH * pixel, height: CANVAS_HEIGHT * pixel },
    turn: asksToTurn(width, height, density),
    panel: room.panel,
    panelPixel: panelPixel(room, density),
    fits: room.fits,
  };
}
