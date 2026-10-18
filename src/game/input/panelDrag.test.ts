import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import {
  clampToCanvas,
  draggedTo,
  isDoubleTap,
  isDrag,
  isGrip,
  nudged,
  PANEL_DRAG,
} from './panelDrag';

const size = { width: 100, height: 40 };

describe('dragging a panel by its frame', () => {
  it('keeps the panel inside the canvas, wherever it is dropped', () => {
    expect(clampToCanvas({ x: -20, y: -5 }, size)).toEqual({ x: 0, y: 0 });
    expect(clampToCanvas({ x: 900, y: 900 }, size)).toEqual({
      x: CANVAS_WIDTH - 100,
      y: CANVAS_HEIGHT - 40,
    });
    expect(clampToCanvas({ x: 10.6, y: 20.2 }, size)).toEqual({ x: 11, y: 20 });
  });

  it('a panel larger than the canvas keeps its top-left corner on it', () => {
    expect(clampToCanvas({ x: 30, y: 30 }, { width: 600, height: 300 })).toEqual({ x: 0, y: 0 });
  });

  it('any drop lands the whole panel on the canvas', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (x, y) => {
          const at = clampToCanvas({ x, y }, size);
          expect(at.x).toBeGreaterThanOrEqual(0);
          expect(at.y).toBeGreaterThanOrEqual(0);
          expect(at.x + size.width).toBeLessThanOrEqual(CANVAS_WIDTH);
          expect(at.y + size.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
        },
      ),
    );
  });

  it('a press becomes a drag only once it has moved a few pixels', () => {
    expect(isDrag({ x: 10, y: 10 }, { x: 11, y: 11 })).toBe(false);
    expect(isDrag({ x: 10, y: 10 }, { x: 10 + PANEL_DRAG.start, y: 10 })).toBe(true);
  });

  it('the panel follows the finger from where it was grabbed', () => {
    const origin = { x: 50, y: 60 };
    expect(draggedTo(origin, { x: 70, y: 70 }, { x: 90, y: 50 }, size)).toEqual({ x: 70, y: 40 });
    // Never off the canvas.
    expect(draggedTo(origin, { x: 70, y: 70 }, { x: -500, y: 70 }, size)).toEqual({ x: 0, y: 60 });
  });

  it('the frame is a grip, a button and a little round it never are', () => {
    const frame = { x: 0, y: 0, width: 100, height: 40 };
    const button = { x: 40, y: 20, width: 20, height: 10 };
    expect(isGrip({ x: 5, y: 5 }, [frame], [button])).toBe(true);
    expect(isGrip({ x: 50, y: 25 }, [frame], [button])).toBe(false);
    // The touch zone a button grows round its wood is still the button's.
    expect(isGrip({ x: 38, y: 25 }, [frame], [button])).toBe(false);
    expect(isGrip({ x: 200, y: 5 }, [frame], [button])).toBe(false);
  });

  it('a double touch: two touches close in time and place', () => {
    const first = { at: { x: 10, y: 10 }, time: 1000 };
    expect(isDoubleTap(null, first)).toBe(false);
    expect(isDoubleTap(first, { at: { x: 12, y: 11 }, time: 1200 })).toBe(true);
    expect(
      isDoubleTap(first, { at: { x: 12, y: 11 }, time: 1000 + PANEL_DRAG.doubleTapMs + 1 }),
    ).toBe(false);
    expect(isDoubleTap(first, { at: { x: 40, y: 10 }, time: 1100 })).toBe(false);
  });

  it('Alt and an arrow move it a few pixels that way, inside the canvas', () => {
    const at = { x: 50, y: 50 };
    expect(nudged(at, 'up', size)).toEqual({ x: 50, y: 50 - PANEL_DRAG.keyStep });
    expect(nudged(at, 'down', size)).toEqual({ x: 50, y: 50 + PANEL_DRAG.keyStep });
    expect(nudged(at, 'left', size)).toEqual({ x: 50 - PANEL_DRAG.keyStep, y: 50 });
    expect(nudged(at, 'right', size)).toEqual({ x: 50 + PANEL_DRAG.keyStep, y: 50 });
    expect(nudged({ x: 0, y: 0 }, 'left', size)).toEqual({ x: 0, y: 0 });
  });
});
