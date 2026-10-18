/**
 * Coalesces the window's changes into one run on the next frame: turning a phone fires `resize`,
 * `orientationchange` and the visual viewport's `resize`, in an order that varies by browser, and
 * the sizes they report settle only by the next frame. Returns the trigger to call on each change;
 * `run` runs once on the frame after the first change, however many came before it, and a change
 * after that run asks for another frame. `requestFrame` is `requestAnimationFrame` in the page.
 */
export function onceAFrame(
  requestFrame: (callback: () => void) => void,
  run: () => void,
): () => void {
  let waiting = false;
  return () => {
    if (waiting) return;
    waiting = true;
    requestFrame(() => {
      waiting = false;
      run();
    });
  };
}
