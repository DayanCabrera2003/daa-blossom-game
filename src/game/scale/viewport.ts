/**
 * What the browser says of its window, in CSS pixels: the page's own box (`clientWidth`,
 * `clientHeight` of the root element) and the window (`innerWidth`, `innerHeight`).
 */
export interface ViewportMeasures {
  readonly clientWidth: number;
  readonly clientHeight: number;
  readonly innerWidth: number;
  readonly innerHeight: number;
}

/** A window's size in CSS pixels. */
export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The size of the window the game is laid out in. It is the page's own box, not the window: on a
 * phone, `innerWidth` is the layout viewport, which the browser grows to hold content wider than
 * the screen, and right after the phone is turned upright that content is the canvas itself, still
 * at the zoom of the other orientation (640 CSS pixels on a screen 390 wide grew it to 515 × 1115).
 * Read from there, the canvas would keep its old size and no notice would ask to turn the phone.
 * The page's box keeps the screen's width (the `viewport` meta's `device-width`), and on a desktop
 * leaves out the scroll bars. While it measures nothing (a page not laid out yet) the window's own
 * size is used, side by side.
 */
export function viewportSize(measures: ViewportMeasures): ViewportSize {
  return {
    width: measures.clientWidth > 0 ? measures.clientWidth : measures.innerWidth,
    height: measures.clientHeight > 0 ? measures.clientHeight : measures.innerHeight,
  };
}
