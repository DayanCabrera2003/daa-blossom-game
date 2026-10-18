/** The internal canvas of the game (GDD §4.1): every pixel of the art lives on this grid. */
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 270;

/** A density the browser can really give (finite, above zero), or 1. */
const usable = (density: number): number => (Number.isFinite(density) && density > 0 ? density : 1);

/** How far short of a whole device pixel a window side may come out and still span it. */
const SLACK = 1e-6;

/**
 * The largest whole zoom at which the canvas fits the window, so pixel art stays crisp (no
 * filtering, no uneven pixels): ×4 on 1080p, ×3 on 1440×810. It is chosen in device pixels (plan
 * 09, phase 7): a window of `windowWidth` × `windowHeight` CSS pixels at `density` device pixels
 * per CSS pixel (`devicePixelRatio`) spans that many times more device pixels, and each logical
 * pixel becomes zoom × zoom of them. A phone of density 3 held sideways (844 × 390 CSS pixels) gets
 * ×4 instead of ×1; at density 1 it is the zoom in CSS pixels. A window side is read as the whole
 * device pixels it spans, so a product that comes out a hair short of a whole pixel still counts it.
 * A window too small for ×1 still gets ×1 and scrolls, rather than a blurry fractional scale.
 */
export function integerZoom(windowWidth: number, windowHeight: number, density = 1): number {
  const scale = usable(density);
  const width = Math.floor(windowWidth * scale + SLACK);
  const height = Math.floor(windowHeight * scale + SLACK);
  const fit = Math.floor(Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT));
  return Math.max(1, fit);
}

/**
 * How many CSS pixels a logical pixel takes on screen at `zoom` device pixels per logical pixel and
 * `density` device pixels per CSS pixel: the canvas is shown that many times its 480 × 270, and the
 * books size their pixel by it (`--zoom`). Fractional in CSS pixels, whole in device pixels.
 */
export const cssPixel = (zoom: number, density = 1): number => zoom / usable(density);
