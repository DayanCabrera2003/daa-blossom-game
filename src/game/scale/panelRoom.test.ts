import { describe, expect, it } from 'vitest';
import { CANVAS_WIDTH, cssPixel, integerZoom, MIN_CSS_PIXEL } from './integerZoom';
import { PANEL_LINE, PANEL_WIDTH, panelPixel, panelRoom, panelUnit } from './panelRoom';

describe('room for the teacher panel beside the canvas', () => {
  it('folded, the canvas keeps the whole window', () => {
    expect(panelRoom(1920, 1080, false)).toEqual({
      zoom: integerZoom(1920, 1080),
      panel: 0,
      fits: true,
    });
  });

  it('open on 1080p, the garden steps down a zoom and the panel takes what is left', () => {
    expect(panelRoom(1920, 1080, true)).toEqual({
      zoom: 3,
      panel: 1920 - 3 * CANVAS_WIDTH,
      fits: true,
    });
  });

  it('when the window already leaves room beside the canvas, the garden keeps its zoom', () => {
    // 1366 × 768: ×2 leaves 406 pixels at the side.
    expect(panelRoom(1366, 768, true)).toEqual({ zoom: 2, panel: 406, fits: true });
  });

  it('a very wide window gives the panel no more than its widest', () => {
    expect(panelRoom(3000, 1080, true)).toEqual({ zoom: 4, panel: PANEL_WIDTH.max, fits: true });
  });

  it('never leaves the canvas and the panel overlapping while the window is wide enough', () => {
    for (let width = 800; width <= 3840; width += 37) {
      for (const height of [600, 768, 900, 1080, 1440]) {
        const { zoom, panel } = panelRoom(width, height, true);
        expect(panel).toBeGreaterThanOrEqual(PANEL_WIDTH.min);
        expect(zoom * CANVAS_WIDTH + panel).toBeLessThanOrEqual(width);
      }
    }
  });

  it('is not offered in a window too narrow for both: the canvas keeps the whole window', () => {
    expect(panelRoom(600, 400, true)).toEqual({ zoom: 1, panel: 0, fits: false });
  });

  it('is shared in device pixels on a dense screen (plan 09, phase 7)', () => {
    // 844 × 390 at density 3: the canvas steps down to ×3 (480 × 270 CSS pixels), the panel takes
    // the 364 CSS pixels left.
    expect(panelRoom(844, 390, true, 3)).toEqual({ zoom: 3, panel: 364, fits: true });
    // Folded, the canvas has the whole window: ×4, 640 × 360 CSS pixels.
    expect(panelRoom(844, 390, false, 3)).toEqual({ zoom: 4, panel: 0, fits: true });
  });

  it('is not offered when the canvas beside it would be smaller than the game at ×1', () => {
    // 640 × 360 at density 3: beside the panel, the canvas would be 320 × 180 CSS pixels.
    expect(panelRoom(640, 360, true, 3)).toEqual({ zoom: 4, panel: 0, fits: false });
  });

  it('property: offered, the canvas is never under ×1 in CSS pixels and leaves the panel its room', () => {
    for (const density of [1, 1.5, 2, 2.625, 3]) {
      for (let width = 300; width <= 3840; width += 53) {
        for (const height of [320, 360, 412, 600, 768, 1080, 1440]) {
          const { zoom, panel, fits } = panelRoom(width, height, true, density);
          if (!fits) {
            expect(panel).toBe(0);
            continue;
          }
          expect(cssPixel(zoom, density)).toBeGreaterThanOrEqual(MIN_CSS_PIXEL);
          expect(panel).toBeGreaterThanOrEqual(PANEL_WIDTH.min);
          expect(cssPixel(zoom, density) * CANVAS_WIDTH + panel).toBeLessThanOrEqual(width + 1e-6);
        }
      }
    }
  });
});

describe("the teacher panel's pixel", () => {
  /** The characters of the pixel font a line of the panel holds at `unit`, inside its edges. */
  const lineOf = (panel: number, unit: number): number =>
    Math.floor((panel - 11 * unit) / (6 * unit));

  it("is the books' at the zoom of the canvas, on the windows the author reviews", () => {
    for (const [width, height] of [
      [1440, 810],
      [1920, 1080],
      [1366, 768],
      [1280, 720],
    ] as const) {
      const { zoom, panel } = panelRoom(width, height, true);
      expect({ width, unit: panelUnit(zoom, panel) }).toEqual({ width, unit: zoom });
    }
  });

  it('steps down while a line of the panel would hold too few characters', () => {
    // 2560 × 1440: the canvas at ×4 leaves the panel its widest, too narrow for ×4 letters.
    const { zoom, panel } = panelRoom(2560, 1440, true);
    expect(zoom).toBe(4);
    expect(panelUnit(zoom, panel)).toBe(3);
  });

  it('keeps every line long enough, and is never under one screen pixel', () => {
    for (let zoom = 1; zoom <= 8; zoom += 1) {
      for (let panel = PANEL_WIDTH.min; panel <= PANEL_WIDTH.max; panel += 7) {
        const unit = panelUnit(zoom, panel);
        expect(unit).toBeGreaterThanOrEqual(1);
        expect(unit).toBeLessThanOrEqual(zoom);
        if (unit > 1) expect(lineOf(panel, unit)).toBeGreaterThanOrEqual(PANEL_LINE);
      }
    }
  });
});

describe("the teacher panel's pixel in CSS pixels", () => {
  it('is the device pixels of its unit over the density, so its letters stay on whole pixels', () => {
    // 844 × 390 at density 3: the canvas at ×3 (one CSS pixel), the panel 364 CSS pixels wide.
    const room = panelRoom(844, 390, true, 3);
    expect(panelPixel(room, 3)).toBe(1);
    expect(panelPixel(panelRoom(1920, 1080, true), 1)).toBe(3);
  });

  it('is never more than the canvas pixel, and a line holds its letters', () => {
    for (const density of [1, 2, 2.625, 3]) {
      for (let width = 600; width <= 3840; width += 61) {
        const room = panelRoom(width, Math.round(width * 0.5), true, density);
        if (!room.fits) continue;
        const unit = panelPixel(room, density);
        expect(unit).toBeLessThanOrEqual(room.zoom / density);
        expect(unit * density).toBeCloseTo(Math.round(unit * density), 9);
      }
    }
  });
});
