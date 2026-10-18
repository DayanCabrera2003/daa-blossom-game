import { describe, expect, it } from 'vitest';
import { viewportSize } from './viewport';

// The window the game lays itself out in. On a phone, `innerWidth` is the layout viewport, which the
// browser grows to fit content wider than the screen: a canvas still at the zoom of the other
// orientation. The page's own box (`documentElement.clientWidth`) keeps the screen's width.

describe('the size of the window the game is laid out in', () => {
  it("reads the page's own box, which content wider than the screen does not grow", () => {
    // A phone turned upright while the canvas is still 640 CSS pixels wide: the layout viewport
    // grew to 515 × 1115, the screen is 390 × 844.
    const measures = { clientWidth: 390, clientHeight: 844, innerWidth: 515, innerHeight: 1115 };
    expect(viewportSize(measures)).toEqual({ width: 390, height: 844 });
  });

  it('on a desktop it is the window less its scroll bars', () => {
    const measures = { clientWidth: 1905, clientHeight: 1080, innerWidth: 1920, innerHeight: 1080 };
    expect(viewportSize(measures)).toEqual({ width: 1905, height: 1080 });
  });

  it("falls back to the window's size while the page's box measures nothing", () => {
    const measures = { clientWidth: 0, clientHeight: 0, innerWidth: 844, innerHeight: 390 };
    expect(viewportSize(measures)).toEqual({ width: 844, height: 390 });
  });

  it('falls back side by side', () => {
    const measures = { clientWidth: 800, clientHeight: 0, innerWidth: 820, innerHeight: 360 };
    expect(viewportSize(measures)).toEqual({ width: 800, height: 360 });
  });
});
