import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { BUTTON_HEIGHT } from './panelLayout';
import { VICTORY, victoryLayout } from './victoryLayout';

/** The box of the button at `index` once laid out. */
const buttonBox = (
  layout: ReturnType<typeof victoryLayout>,
  widths: readonly number[],
  i: number,
) => {
  const at = layout.buttons[i] ?? { x: NaN, y: NaN };
  return { x0: at.x, y0: at.y, x1: at.x + (widths[i] ?? 0), y1: at.y + BUTTON_HEIGHT };
};

/** Whether two boxes share no pixel. */
const apart = (
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
): boolean => a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;

/** Checks every rule of the panel for buttons of `widths` and a middle line of `line` pixels. */
function expectSound(widths: readonly number[], line: number): void {
  const layout = victoryLayout(widths, line);
  const panel = {
    x0: layout.x,
    y0: layout.y,
    x1: layout.x + layout.width,
    y1: layout.y + layout.height,
  };
  expect(panel.x0).toBeGreaterThanOrEqual(0);
  expect(panel.x1).toBeLessThanOrEqual(CANVAS_WIDTH);
  expect(panel.y0).toBeGreaterThanOrEqual(0);
  expect(panel.y1).toBeLessThanOrEqual(CANVAS_HEIGHT);
  // The middle line ends before the buttons start, and inside the panel's padding.
  expect(layout.lineY + VICTORY.lineHeight).toBeLessThanOrEqual(
    Math.min(...layout.buttons.map((b) => b.y)),
  );
  expect(line).toBeLessThanOrEqual(layout.width - 2 * VICTORY.pad);
  widths.forEach((_, i) => {
    const box = buttonBox(layout, widths, i);
    // Inside the panel, its padding kept.
    expect(box.x0).toBeGreaterThanOrEqual(panel.x0 + VICTORY.pad);
    expect(box.x1).toBeLessThanOrEqual(panel.x1 - VICTORY.pad);
    expect(box.y1).toBeLessThanOrEqual(panel.y1 - VICTORY.bottomPad);
    // Never over another button.
    for (let j = i + 1; j < widths.length; j++) {
      expect(apart(box, buttonBox(layout, widths, j))).toBe(true);
    }
  });
}

describe('the victory panel laid out round what it says', () => {
  it('keeps two buttons of 100 px apart, though together they pass the old 200 px panel', () => {
    // "Volver al jardín" and "Siguiente jardín": sixteen letters of 6 px, plus the panel's 4.
    expectSound([100, 100], 120);
    expect(victoryLayout([100, 100], 120).width).toBeGreaterThan(200);
  });

  it('stays the 200 px panel it was when its contents fit there', () => {
    const layout = victoryLayout([46, 46], 120);
    expect(layout.width).toBe(VICTORY.minWidth);
    expect(layout.height).toBe(70);
  });

  it('centres a lone button, the way back of a last garden or of the free mode', () => {
    const layout = victoryLayout([118], 120);
    const at = layout.buttons[0] ?? { x: 0, y: 0 };
    expect(at.x * 2 + 118).toBe(layout.x * 2 + layout.width);
    expectSound([118], 120);
  });

  it('puts the buttons on rows of their own when side by side they would not fit the canvas', () => {
    const layout = victoryLayout([300, 300], 120);
    expect(layout.buttons[0]?.y).not.toBe(layout.buttons[1]?.y);
    expectSound([300, 300], 120);
  });

  it('property: any buttons and middle line that fit the canvas lay out with nothing overlapping', () => {
    const widest = CANVAS_WIDTH - 2 * VICTORY.margin - 2 * VICTORY.pad;
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 10, max: widest }), { minLength: 1, maxLength: 2 }),
        fc.integer({ min: 0, max: widest }),
        (widths, line) => expectSound(widths, line),
      ),
    );
  });
});
