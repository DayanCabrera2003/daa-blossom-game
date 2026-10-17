import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { HUB, layoutHub } from './hubLayout';

/** The height of a greybox button: an 8-pixel text and its panel. */
const HEIGHT = 11;
/** A wide level button: "1.1 ★★★" with stars wider than the digits. */
const WIDE = 47;
/** A level button of a two-digit level, "4.12 ★★★". */
const WIDER = 52;

/** Every button of a layout as a box: left, top, right, bottom. */
const boxes = (widths: readonly (readonly number[])[], height = HEIGHT) =>
  layoutHub(widths, height).chapters.flatMap((chapter, c) =>
    chapter.buttons.map((at, b) => ({
      x0: at.x,
      y0: at.y,
      x1: at.x + (widths[c]?.[b] ?? 0),
      y1: at.y + height,
    })),
  );

describe('the hub layout', () => {
  it('the nine levels of a chapter fit in one row, even with three wide stars each', () => {
    const [chapter] = layoutHub([Array<number>(9).fill(WIDE)], HEIGHT).chapters;
    const ys = new Set(chapter?.buttons.map((at) => at.y));
    expect(ys.size).toBe(1);
    const last = chapter?.buttons.at(-1);
    expect((last?.x ?? Infinity) + WIDE).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
  });

  it('each chapter has its title above its row, and the next chapter starts below both', () => {
    const { chapters } = layoutHub([[30], [30, 30]], HEIGHT);
    const [first, second] = chapters;
    expect(first?.titleY).toBe(HUB.top);
    expect(first?.buttons[0]).toEqual({ x: HUB.margin, y: HUB.top + HUB.titleHeight });
    expect(second?.titleY).toBeGreaterThan((first?.buttons[0]?.y ?? 0) + HEIGHT);
    expect(second?.buttons[1]?.x).toBe(HUB.margin + 30 + HUB.gap);
  });

  it('a row too long for the canvas goes on below, never past its right edge', () => {
    const { chapters, bottom } = layoutHub([Array<number>(12).fill(60)], HEIGHT);
    const [chapter] = chapters;
    const lines = [...new Set(chapter?.buttons.map((at) => at.y))];
    expect(lines).toHaveLength(2);
    expect(bottom).toBe((lines[1] ?? 0) + HEIGHT);
  });

  it('every chapter of teacher mode, drafts included, stays above the export button', () => {
    // Chapters 0, 1, 2, 3, 4, 5 and 7 as the catalog has them: 5, 9, 4, 9, 12, 1 and 3 levels.
    // The ids of chapter 4 run to "4.12", a digit wider, so its buttons are wider still.
    const counts = [5, 9, 4, 9, 12, 1, 3];
    const widths = counts.map((count, c) => Array<number>(count).fill(c === 4 ? WIDER : WIDE));
    const { chapters, bottom } = layoutHub(widths, HEIGHT);
    expect(bottom + HUB.gap).toBeLessThanOrEqual(HUB.exportY);
    // The twelve festival levels take two lines, the nine of the greenhouse only one.
    const lines = (c: number) => new Set(chapters[c]?.buttons.map((at) => at.y)).size;
    expect(lines(3)).toBe(1);
    expect(lines(4)).toBe(2);
  });

  it('buttons never overlap and never leave the canvas sideways', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 10, max: 120 }), { maxLength: 12 }), {
          maxLength: 6,
        }),
        (widths) => {
          const all = boxes(widths);
          for (const box of all) {
            expect(box.x0).toBeGreaterThanOrEqual(HUB.margin);
            expect(box.x1).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
          }
          all.forEach((a, i) =>
            all.slice(i + 1).forEach((b) => {
              const apart = a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;
              expect(apart).toBe(true);
            }),
          );
        },
      ),
    );
  });

  it('an empty hub ends where it starts; a chapter with no level shown is just its title', () => {
    expect(layoutHub([], HEIGHT)).toEqual({ chapters: [], bottom: HUB.top });
    expect(layoutHub([[]], HEIGHT)).toEqual({
      chapters: [{ titleY: HUB.top, buttons: [] }],
      bottom: HUB.top + HUB.titleHeight,
    });
  });
});
