import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  firstSpot,
  focusLayer,
  moveFocus,
  readingOrder,
  reachable,
  refocus,
  type FocusSpot,
} from './focusOrder';

/** A spot named `id`, `width` wide and 10 tall at (x, y), at depth `depth`. */
const spot = (id: string, x: number, y: number, depth = 100, width = 20): FocusSpot<string> => ({
  id,
  box: { x, y, width, height: 10 },
  depth,
});

/** Three rows of buttons, as a hub of levels lays them out. */
const GRID = [
  spot('c', 70, 40),
  spot('a', 10, 40),
  spot('b', 40, 41),
  spot('e', 40, 70),
  spot('d', 10, 70),
  spot('f', 10, 100),
];

describe('the reading order of a screen', () => {
  it('reads rows top to bottom and each row left to right', () => {
    expect(readingOrder(GRID.map((one) => one.box)).map((i) => GRID[i]?.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);
  });

  it('keeps a box a pixel lower in its row', () => {
    const boxes = [spot('right', 50, 12).box, spot('left', 10, 10).box];
    expect(readingOrder(boxes)).toEqual([1, 0]);
  });

  it('visits every box exactly once, whatever the boxes', () => {
    const box = fc.record({
      x: fc.integer({ min: 0, max: 460 }),
      y: fc.integer({ min: 0, max: 260 }),
      width: fc.integer({ min: 1, max: 60 }),
      height: fc.integer({ min: 1, max: 20 }),
    });
    fc.assert(
      fc.property(fc.array(box, { maxLength: 40 }), (boxes) => {
        const order = readingOrder(boxes);
        expect([...order].sort((a, b) => a - b)).toEqual(boxes.map((_, i) => i));
      }),
    );
  });
});

describe('what the keyboard can reach', () => {
  it('leaves out what a cover above hides, as it would take the pointer', () => {
    const spots = [
      spot('under', 10, 10, 100),
      spot('beside', 300, 10, 100),
      spot('on', 12, 12, 252),
    ];
    const cover = { box: { x: 0, y: 0, width: 200, height: 100 }, depth: 150 };
    expect(reachable(spots, [cover]).map((one) => one.id)).toEqual(['beside', 'on']);
  });

  it('keeps what lies over the cover, or under no cover at all', () => {
    const spots = [spot('a', 10, 10, 100)];
    expect(reachable(spots, [])).toEqual(spots);
    expect(reachable(spots, [{ box: { x: 0, y: 0, width: 5, height: 5 }, depth: 400 }])).toEqual(
      spots,
    );
  });

  it('counts layers by hundreds of depth: the HUD, the panels, the victory, the settings', () => {
    expect([2, 100, 102, 200, 252, 302, 414].map(focusLayer)).toEqual([0, 1, 1, 2, 2, 3, 4]);
  });
});

describe('moving the focus', () => {
  it('starts on the first spot of the topmost layer', () => {
    const spots = [...GRID, spot('panel', 200, 200, 252), spot('panel2', 100, 200, 252)];
    expect(firstSpot(spots)).toBe('panel2');
    expect(firstSpot(GRID)).toBe('a');
    expect(firstSpot([])).toBeNull();
  });

  it('Tab and the side arrows walk the reading order round, and back with Shift', () => {
    expect(moveFocus(GRID, 'a', 'next')).toBe('b');
    expect(moveFocus(GRID, 'f', 'next')).toBe('a');
    expect(moveFocus(GRID, 'a', 'previous')).toBe('f');
    expect(moveFocus(GRID, 'c', 'right')).toBe('d');
    expect(moveFocus(GRID, 'd', 'left')).toBe('c');
  });

  it('the up and down arrows go to the nearest spot of the row above or below', () => {
    expect(moveFocus(GRID, 'b', 'down')).toBe('e');
    expect(moveFocus(GRID, 'c', 'down')).toBe('e');
    expect(moveFocus(GRID, 'e', 'down')).toBe('f');
    expect(moveFocus(GRID, 'f', 'up')).toBe('d');
    expect(moveFocus(GRID, 'e', 'up')).toBe('b');
  });

  it('stays at the top and the bottom rows', () => {
    expect(moveFocus(GRID, 'a', 'up')).toBe('a');
    expect(moveFocus(GRID, 'f', 'down')).toBe('f');
  });

  it('any move with nothing in focus, or a focus gone, starts at the first spot', () => {
    expect(moveFocus(GRID, null, 'previous')).toBe('a');
    expect(moveFocus(GRID, 'gone', 'down')).toBe('a');
    expect(moveFocus([], null, 'next')).toBeNull();
  });

  it('Tab from any spot comes back to it after visiting every spot once', () => {
    let at: string | null = 'c';
    const seen: string[] = [];
    for (let i = 0; i < GRID.length; i += 1) {
      at = moveFocus(GRID, at, 'next');
      seen.push(at ?? '');
    }
    expect(at).toBe('c');
    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});

describe('keeping the focus while the screen changes', () => {
  it('keeps the spot in focus while it is there and nothing opens above it', () => {
    const state = { current: 'b', top: 1, saved: [] };
    expect(refocus(state, GRID)).toEqual(state);
  });

  it('a panel opening above moves the focus onto it, keeping where it was', () => {
    const panel = [...GRID, spot('ok', 100, 200, 264)];
    expect(refocus({ current: 'b', top: 1, saved: [] }, panel)).toEqual({
      current: 'ok',
      top: 2,
      saved: ['b'],
    });
  });

  it('a panel closing gives the focus back to where it was', () => {
    expect(refocus({ current: 'ok', top: 2, saved: ['b'] }, GRID)).toEqual({
      current: 'b',
      top: 1,
      saved: [],
    });
  });

  it('a spot gone with nowhere to go back to leaves the focus on the first spot', () => {
    expect(refocus({ current: 'gone', top: 1, saved: ['also gone'] }, GRID)).toEqual({
      current: 'a',
      top: 1,
      saved: [],
    });
  });

  it('a spot of a lower layer reached with Tab keeps the focus while the panel stays', () => {
    const panel = [...GRID, spot('line', 100, 200, 200)];
    const state = { current: 'b', top: 2, saved: [] };
    expect(refocus(state, panel)).toEqual(state);
  });

  it('without the keyboard in use nothing takes the focus, but the top layer is followed', () => {
    const panel = [...GRID, spot('ok', 100, 200, 264)];
    expect(refocus({ current: null, top: 1, saved: [] }, panel)).toEqual({
      current: null,
      top: 2,
      saved: [],
    });
  });
});
