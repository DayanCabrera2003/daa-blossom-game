import { describe, expect, it } from 'vitest';
import type { Design } from './design';
import { EDITOR_AREA } from './editorArea';
import { fitIntoEditor } from './fitIntoEditor';

/** A design of sprouts at `ys`, 40 px apart from left to right, the first two joined and lit. */
const at = (...ys: number[]): Design => ({
  sprouts: ys.map((y, i) => ({ label: String.fromCharCode(65 + i), x: 60 + 40 * i, y })),
  vines: [['A', 'B']],
  lanterns: [['A', 'B']],
});

/** The distances between every two sprouts of a design, in order. */
const gaps = (design: Design): number[][] =>
  design.sprouts.map((one) => design.sprouts.map((other) => other.y - one.y));

describe("fitting an opened garden into the editor's free area", () => {
  it('moves a garden with a sprout under the header down just enough, keeping its shape', () => {
    const opened = at(30, 80, 150);
    const fitted = fitIntoEditor(opened);
    const ys = fitted.sprouts.map((sprout) => sprout.y);
    expect(Math.min(...ys)).toBe(EDITOR_AREA.y0);
    expect(ys.every((y) => y >= EDITOR_AREA.y0 && y <= EDITOR_AREA.y1)).toBe(true);
    expect(gaps(fitted)).toEqual(gaps(opened));
    expect(fitted.sprouts.map((sprout) => sprout.x)).toEqual(opened.sprouts.map((s) => s.x));
    expect(fitted.vines).toEqual(opened.vines);
    expect(fitted.lanterns).toEqual(opened.lanterns);
  });

  it('moves a garden with a name over the buttons up just enough', () => {
    const fitted = fitIntoEditor(at(100, EDITOR_AREA.y1 + 4));
    expect(fitted.sprouts.map((sprout) => sprout.y)).toEqual([96, EDITOR_AREA.y1]);
  });

  it('leaves a garden that already fits where it is', () => {
    const fits = at(EDITOR_AREA.y0, 120, EDITOR_AREA.y1);
    expect(fitIntoEditor(fits)).toBe(fits);
  });

  it('leaves a garden taller than the free area as it is, still to be edited', () => {
    const tall = at(EDITOR_AREA.y0 - 3, EDITOR_AREA.y1 + 1);
    expect(fitIntoEditor(tall)).toBe(tall);
  });

  it('leaves an empty garden as it is', () => {
    const empty: Design = { sprouts: [], vines: [], lanterns: [] };
    expect(fitIntoEditor(empty)).toBe(empty);
  });

  it('keeps the bees and the flowers of a garden', () => {
    const kinded: Design = {
      sprouts: [
        { label: 'A', x: 100, y: 30, kind: 'bee' },
        { label: 'B', x: 160, y: 60, kind: 'flower' },
      ],
      vines: [['A', 'B']],
      lanterns: [],
    };
    expect(fitIntoEditor(kinded).sprouts).toEqual([
      { label: 'A', x: 100, y: EDITOR_AREA.y0, kind: 'bee' },
      { label: 'B', x: 160, y: EDITOR_AREA.y0 + 30, kind: 'flower' },
    ]);
  });
});
