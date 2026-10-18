import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { HUB_SIGN } from './hubGarden';
import { epilogueSignAt, HUB, layoutHub } from './hubLayout';
import { PIXEL_FONT } from './pixelFont';

/** The height of a button: a line of the pixel font (12 px) and its panel. */
const HEIGHT = 14;
/** The width of a text of `chars` characters in the pixel font, which is monospaced. */
const text = (chars: number): number => chars * PIXEL_FONT.advance;
/** A level button with three stars: "1.1 " and four blank cells for the stars, in its panel. */
const WIDE = text(8) + 4;
/** A level button of a two-digit level with three stars, "4.12 " and the stars. */
const WIDER = text(9) + 4;
/** The chapter names of the hub (content/es/strings.json), as wide as the font draws them. */
const TITLES = [
  'El Huerto',
  'El Prado',
  'El Estanque',
  'El Invernadero',
  'El Festival',
  'El Jardín Salvaje',
  'El Recetario',
  'El Consejo de los Robles',
].map((name) => text(name.length));

/** Every button of a layout as a box, and each title as a box on its chapter's first line. */
function boxes(widths: readonly (readonly number[])[], titles: readonly number[], height = HEIGHT) {
  const { chapters } = layoutHub(widths, height, titles);
  const buttons = chapters.flatMap((chapter, c) =>
    chapter.buttons.map((at, b) => ({
      x0: at.x,
      y0: at.y,
      x1: at.x + (widths[c]?.[b] ?? 0),
      y1: at.y + height,
    })),
  );
  const heads = chapters.map((chapter, c) => ({
    x0: HUB.margin,
    y0: chapter.titleY,
    x1: HUB.margin + (titles[c] ?? 0),
    y1: chapter.titleY + height,
  }));
  return { buttons, heads };
}

type Box = ReturnType<typeof boxes>['buttons'][number];
const apart = (a: Box, b: Box): boolean =>
  a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;

describe('the hub layout', () => {
  it('writes each chapter title at the left of its first line, its buttons right after it', () => {
    const { chapters } = layoutHub([[30], [30, 30]], HEIGHT, [40, 50]);
    const [first, second] = chapters;
    expect(first?.titleY).toBe(HUB.top);
    expect(first?.buttons[0]).toEqual({ x: HUB.margin + 40 + HUB.titleGap, y: HUB.top });
    expect(second?.titleY).toBe(HUB.top + HEIGHT + HUB.gap);
    expect(second?.buttons).toEqual([
      { x: HUB.margin + 50 + HUB.titleGap, y: second?.titleY },
      { x: HUB.margin + 50 + HUB.titleGap + 30 + HUB.gap, y: second?.titleY },
    ]);
  });

  it('a row too long for the canvas goes on below, under the first button and never past the edge', () => {
    const { chapters, bottom } = layoutHub([Array<number>(12).fill(60)], HEIGHT, [40]);
    const [chapter] = chapters;
    const lines = [...new Set(chapter?.buttons.map((at) => at.y))];
    expect(lines).toHaveLength(2);
    expect(new Set(chapter?.buttons.map((at) => at.x)).size).toBeLessThan(12);
    expect(chapter?.buttons.every((at) => at.x >= HUB.margin + 40 + HUB.titleGap)).toBe(true);
    expect(bottom).toBe((lines[1] ?? 0) + HEIGHT);
  });

  it("every chapter, each level with three stars, stays above the bed of the hub's garden", () => {
    // Chapters 0 to 7 as the catalog has them: 5, 9, 4, 9, 12, 5, 6 and 5 levels.
    // The ids of chapter 4 run to "4.12", a digit wider, so its buttons are wider still.
    const counts = [5, 9, 4, 9, 12, 5, 6, 5];
    const widths = counts.map((count, c) => Array<number>(count).fill(c === 4 ? WIDER : WIDE));
    // Each title hangs from its signpost, which comes before it on the line.
    const signed = TITLES.map((title) => title + HUB_SIGN.width + HUB_SIGN.gap);
    const { bottom } = layoutHub(widths, HEIGHT, signed);
    expect(bottom + HUB.gap).toBeLessThanOrEqual(HUB.gardenTop);
    // The signs of the top line stay out of the way of the chapters.
    expect(HUB.topLineY + HEIGHT).toBeLessThanOrEqual(HUB.top);
    const { buttons, heads } = boxes(widths, TITLES);
    for (const head of heads) for (const button of buttons) expect(apart(head, button)).toBe(true);
  });

  it('buttons never overlap each other nor a title, and never leave the canvas sideways', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.integer({ min: 0, max: 150 }),
            // Up to 300 px: some buttons do not fit after a long title and take a line from the margin.
            row: fc.array(fc.integer({ min: 10, max: 300 }), { maxLength: 12 }),
          }),
          { maxLength: 6 },
        ),
        (chapters) => {
          const widths = chapters.map((chapter) => chapter.row);
          const { buttons, heads } = boxes(
            widths,
            chapters.map((chapter) => chapter.title),
          );
          for (const box of buttons) {
            expect(box.x0).toBeGreaterThanOrEqual(HUB.margin);
            expect(box.x1).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
            for (const head of heads) expect(apart(box, head)).toBe(true);
          }
          buttons.forEach((a, i) =>
            buttons.slice(i + 1).forEach((b) => expect(apart(a, b)).toBe(true)),
          );
        },
      ),
    );
    // Many boxes per case: exploring with thousands of runs needs more than the default 5 s.
  }, 30_000);

  it('a button too wide for the room after its title starts a line of its own, from the margin', () => {
    const wide = CANVAS_WIDTH - 2 * HUB.margin;
    const { chapters, bottom } = layoutHub([[wide]], HEIGHT, [100]);
    expect(chapters[0]?.buttons).toEqual([{ x: HUB.margin, y: HUB.top + HEIGHT + HUB.gap }]);
    expect(bottom).toBe(HUB.top + 2 * HEIGHT + HUB.gap);
    // After a button that fits, it goes to the next line, again from the margin.
    const later = layoutHub([[30, wide]], HEIGHT, [100]).chapters[0]?.buttons;
    expect(later).toEqual([
      { x: HUB.margin + 100 + HUB.titleGap, y: HUB.top },
      { x: HUB.margin, y: HUB.top + HEIGHT + HUB.gap },
    ]);
  });

  it('an empty hub ends where it starts; a chapter with no level shown is just its title', () => {
    expect(layoutHub([], HEIGHT, [])).toEqual({ chapters: [], bottom: HUB.top });
    expect(layoutHub([[]], HEIGHT, [40])).toEqual({
      chapters: [{ titleY: HUB.top, buttons: [] }],
      bottom: HUB.top + HEIGHT,
    });
  });

  it('the sign of the epilogue stands centred in the bed of the garden, a margin above the bottom', () => {
    const width = text('Más allá del jardín'.length) + 4;
    const at = epilogueSignAt(width, HEIGHT);
    expect(at).toEqual({
      x: Math.round((CANVAS_WIDTH - width) / 2),
      y: CANVAS_HEIGHT - HUB.margin - HEIGHT,
    });
    expect(at.y).toBeGreaterThanOrEqual(HUB.gardenTop);
  });
});
