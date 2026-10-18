import { describe, expect, it } from 'vitest';
import { CANVAS_WIDTH, integerZoom } from './integerZoom';
import { PANEL_WIDTH, panelRoom } from './panelRoom';

describe('room for the teacher panel beside the canvas', () => {
  it('folded, the canvas keeps the whole window', () => {
    expect(panelRoom(1920, 1080, false)).toEqual({ zoom: integerZoom(1920, 1080), panel: 0 });
  });

  it('open on 1080p, the garden steps down a zoom and the panel takes what is left', () => {
    expect(panelRoom(1920, 1080, true)).toEqual({ zoom: 3, panel: 1920 - 3 * CANVAS_WIDTH });
  });

  it('when the window already leaves room beside the canvas, the garden keeps its zoom', () => {
    // 1366 × 768: ×2 leaves 406 pixels at the side.
    expect(panelRoom(1366, 768, true)).toEqual({ zoom: 2, panel: 406 });
  });

  it('a very wide window gives the panel no more than its widest', () => {
    expect(panelRoom(3000, 1080, true)).toEqual({ zoom: 4, panel: PANEL_WIDTH.max });
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

  it('a window too narrow for both still shows the panel at its narrowest, over the canvas', () => {
    expect(panelRoom(600, 400, true)).toEqual({ zoom: 1, panel: PANEL_WIDTH.min });
  });
});
