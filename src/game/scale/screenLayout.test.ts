import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH, cssPixel } from './integerZoom';
import { asksToTurn } from './orientation';
import { panelPixel, panelRoom } from './panelRoom';
import { screenLayout, type ScreenLayout } from './screenLayout';
import { viewportSize, type ViewportMeasures } from './viewport';

// The page laid out for the window as it is now, decided again on every change of the window
// (a phone turned either way, a desktop window resized, the browser's zoom or another screen
// changing the density): the notice to turn a phone, the whole zoom, the canvas's size in CSS
// pixels and the teacher's panel's room. It depends on nothing but the window as it is now.

/** A screen at one moment: its window in CSS pixels and its density. */
interface Moment {
  readonly width: number;
  readonly height: number;
  readonly density: number;
}

const SIDEWAYS: Moment = { width: 844, height: 390, density: 3 };
const UPRIGHT: Moment = { width: 390, height: 844, density: 3 };

/**
 * What a phone's browser reports for `screen` while the canvas is `canvas` CSS pixels wide and
 * centred in it: content wider than the screen (the canvas at the zoom of the other orientation,
 * its left edge cut) grows the layout viewport (`innerWidth`, `innerHeight`) to hold it, at the
 * screen's proportions; the page's own box keeps the screen's size. On the P3 review a canvas 640
 * wide on a phone 390 wide grew it to 515 × 1115.
 */
function phoneMeasures(screen: Moment, canvas: number): ViewportMeasures {
  const right = Math.max(screen.width, (screen.width + canvas) / 2);
  const grown = right / screen.width;
  return {
    clientWidth: screen.width,
    clientHeight: screen.height,
    innerWidth: right,
    innerHeight: screen.height * grown,
  };
}

/** Lays the page out for each moment in turn, each time measured with the last canvas still up. */
function turnThrough(moments: readonly Moment[], panelOpen = false): ScreenLayout[] {
  const first = moments[0] ?? SIDEWAYS;
  let canvas = screenLayout(first, first.density, panelOpen).canvas.width;
  return moments.map((moment) => {
    const layout = screenLayout(
      viewportSize(phoneMeasures(moment, canvas)),
      moment.density,
      panelOpen,
    );
    canvas = layout.canvas.width;
    return layout;
  });
}

/** The canvas fits the window: never wider nor taller, in CSS pixels. */
function expectFits(layout: ScreenLayout, moment: Moment): void {
  expect(layout.canvas.width).toBeLessThanOrEqual(moment.width);
  expect(layout.canvas.height).toBeLessThanOrEqual(moment.height);
}

describe('the page laid out for the window as it is now', () => {
  it('is the zoom, the canvas in CSS pixels, the notice and the folded panel of the window', () => {
    expect(screenLayout(SIDEWAYS, 3, false)).toEqual({
      zoom: 4,
      pixel: 4 / 3,
      canvas: { width: 640, height: 360 },
      turn: false,
      panel: 0,
      panelPixel: panelPixel(panelRoom(844, 390, false, 3), 3),
      fits: true,
    });
  });

  it('upright on a phone it asks to turn it, with the canvas small behind the notice', () => {
    const layout = screenLayout(UPRIGHT, 3, false);
    expect(layout.turn).toBe(true);
    expect(layout.zoom).toBe(2);
    expectFits(layout, UPRIGHT);
  });

  it('with the panel open, it shares the window with the panel when it fits', () => {
    const room = panelRoom(1920, 1080, true, 1);
    const layout = screenLayout({ width: 1920, height: 1080 }, 1, true);
    expect(layout).toMatchObject({ zoom: room.zoom, panel: room.panel, fits: true });
    expect(layout.canvas.width + layout.panel).toBeLessThanOrEqual(1920);
  });

  it('a phone turned upright while the game runs asks to turn it and refits the canvas', () => {
    const [sideways, upright] = turnThrough([SIDEWAYS, UPRIGHT]);
    expect(sideways?.turn).toBe(false);
    expect(upright?.turn).toBe(true);
    expect(upright?.zoom).toBe(2);
    if (upright !== undefined) expectFits(upright, UPRIGHT);
  });

  it('landscape → portrait → landscape → portrait gives each window its own layout', () => {
    const moments = [SIDEWAYS, UPRIGHT, SIDEWAYS, UPRIGHT];
    turnThrough(moments).forEach((layout, at) => {
      const moment = moments[at] ?? SIDEWAYS;
      expect(layout).toEqual(screenLayout(moment, moment.density, false));
      expect(layout.turn).toBe(moment === UPRIGHT);
      expectFits(layout, moment);
    });
  });

  it('a phone turned sideways drops the notice and grows the canvas again', () => {
    const [upright, sideways] = turnThrough([UPRIGHT, SIDEWAYS]);
    expect(upright?.turn).toBe(true);
    expect(sideways).toMatchObject({ turn: false, zoom: 4, canvas: { width: 640, height: 360 } });
  });

  it('a desktop window resized smaller and back follows each size', () => {
    const moments: Moment[] = [
      { width: 1920, height: 1080, density: 1 },
      { width: 1000, height: 700, density: 1 },
      { width: 1920, height: 1080, density: 1 },
    ];
    expect(turnThrough(moments).map((layout) => layout.zoom)).toEqual([4, 2, 4]);
  });

  it('a change of density (the browser zoom, another screen) keeps whole device pixels', () => {
    const moments: Moment[] = [
      { width: 1920, height: 1080, density: 1 },
      { width: 1280, height: 720, density: 1.5 },
      { width: 960, height: 540, density: 2 },
    ];
    turnThrough(moments).forEach((layout, at) => {
      const moment = moments[at] ?? SIDEWAYS;
      expect(layout.zoom).toBe(4);
      expect(layout.pixel * moment.density).toBe(layout.zoom);
      expectFits(layout, moment);
    });
  });

  it('property: after any sequence of windows the canvas fits and each step is its own', () => {
    // Any window that holds the canvas at ×1 in CSS pixels (smaller, the page scrolls instead).
    const moment = fc.record({
      width: fc.integer({ min: CANVAS_WIDTH, max: 3840 }),
      height: fc.integer({ min: CANVAS_HEIGHT, max: 2160 }),
      density: fc.constantFrom(1, 1.25, 1.5, 2, 2.625, 3),
    });
    fc.assert(
      fc.property(fc.array(moment, { minLength: 1, maxLength: 6 }), fc.boolean(), (seq, open) => {
        turnThrough(seq, open).forEach((layout, at) => {
          const now = seq[at] ?? SIDEWAYS;
          expect(layout).toEqual(screenLayout(now, now.density, open));
          expect(layout.zoom).toBe(panelRoom(now.width, now.height, open, now.density).zoom);
          expect(layout.turn).toBe(asksToTurn(now.width, now.height, now.density));
          expect(layout.pixel).toBe(cssPixel(layout.zoom, now.density));
          expect(layout.canvas).toEqual({
            width: CANVAS_WIDTH * layout.pixel,
            height: CANVAS_HEIGHT * layout.pixel,
          });
          expectFits(layout, now);
        });
      }),
    );
  });
});
