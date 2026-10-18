import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import { HUB, layoutHub } from './hubLayout';
import { PIXEL_FONT } from './pixelFont';
import {
  finishedChapters,
  HUB_PIECES,
  HUB_SIGN,
  HUB_TINT,
  hubGarden,
  signBox,
  type HubPlanting,
} from './hubGarden';
import { OAKS, seasonOf, SOIL_PATCH } from './seasons';

/** The level counts of the hub today, by chapter. */
const COUNTS = [5, 9, 4, 9, 12, 5, 6, 5];
/** The height of a button: a line of the pixel font and its panel. */
const HEIGHT = 14;
/** The width of a text of `chars` characters in the pixel font, which is monospaced. */
const text = (chars: number): number => chars * PIXEL_FONT.advance;
/** The chapter names of the hub (content/es/strings.json). */
const NAMES = [
  'El Huerto',
  'El Prado',
  'El Estanque',
  'El Invernadero',
  'El Festival',
  'El Jardín Salvaje',
  'El Recetario',
  'El Consejo de los Robles',
];

/**
 * The boxes of the hub as the scene lays it out, every level with no stars yet or with three (the
 * widest buttons): the heading, the export button and the gear on the top line, then each
 * chapter's sign, title and buttons.
 */
function hubBoxes(stars: boolean): Rect[] {
  const titleWidths = NAMES.map((name) => text(name.length) + HUB_SIGN.width + HUB_SIGN.gap);
  // "1.1 ·" or "1.1 " and four blank cells for the stars; a digit more for "4.10" to "4.12".
  const widths = COUNTS.map((count, c) =>
    Array.from({ length: count }, () => text((stars ? 8 : 5) + (c === 4 ? 1 : 0)) + 4),
  );
  const layout = layoutHub(widths, HEIGHT, titleWidths);
  return [
    { x: HUB.margin, y: 6, width: text(8), height: 12 },
    {
      x: CANVAS_WIDTH - HUB.margin - 13 - HUB.gap - 168,
      y: HUB.topLineY - 1,
      width: 168,
      height: HEIGHT,
    },
    { x: CANVAS_WIDTH - HUB.margin - 13, y: 4, width: 13, height: 13 },
    ...layout.chapters.flatMap(({ titleY, buttons }, c) => [
      signBox(titleY, HEIGHT),
      { x: HUB.margin, y: titleY, width: titleWidths[c] ?? 0, height: HEIGHT },
      ...buttons.map(({ x, y }, b) => ({
        x,
        y: y - 1,
        width: widths[c]?.[b] ?? 0,
        height: HEIGHT,
      })),
    ]),
  ];
}

const boxOf = ({ ornament, x, y }: HubPlanting): Rect => ({
  x,
  y,
  width: ornament.width,
  height: ornament.height,
});

const ALL = new Set(['0', '1', '2', '3', '4', '5', '6', '7']);

describe('the hub that grows (plan 06, section 1.5)', () => {
  it('counts a chapter finished once every level of it that is not a draft is done', () => {
    const levels = [
      { id: '0.1' },
      { id: '0.2' },
      { id: '1.1' },
      { id: '1.2', draft: true },
      { id: '2.1' },
    ];
    const done = new Set(['0.1', '1.1']);
    expect(finishedChapters(levels, (id) => done.has(id))).toEqual(new Set(['1']));
    done.add('0.2');
    expect(finishedChapters(levels, (id) => done.has(id))).toEqual(new Set(['0', '1']));
    // A chapter of drafts only is never finished.
    expect(finishedChapters([{ id: '8.1', draft: true }], () => true)).toEqual(new Set());
  });

  it('never waits for the secret flower of a chapter, nor counts a chapter of one alone', () => {
    const levels = [{ id: '1.1' }, { id: '1.2' }, { id: '1.3', secret: { stars: 3 } }];
    const done = new Set(['1.1', '1.2']);
    expect(finishedChapters(levels, (id) => done.has(id))).toEqual(new Set(['1']));
    expect(finishedChapters([{ id: '8.1', secret: { stars: 1 } }], () => true)).toEqual(new Set());
  });

  it('has a piece for each chapter: the orchard plots first and the oaks last', () => {
    expect(HUB_PIECES).toHaveLength(8);
    expect(HUB_PIECES[0]).toBe(SOIL_PATCH);
    expect(HUB_PIECES[7]).toBe(OAKS);
    // The greenhouse is glass: turquoise and half see-through.
    const glass = HUB_PIECES[3]?.parts[0];
    expect(glass?.glass).toBe(0x8feff1);
    expect(glass?.alpha).toBeLessThan(1);
  });

  it('shows only the orchard, its ground, when no chapter is finished', () => {
    expect(hubGarden(new Set(), hubBoxes(false))).toEqual([]);
    // Under the orchard's own warm light.
    expect(HUB_TINT).toBe(seasonOf('0').tint);
  });

  it('plants the oaks once chapter 7 is finished', () => {
    const garden = hubGarden(new Set(['7']), hubBoxes(true));
    expect(garden.map(({ chapter }) => chapter)).toEqual(['7']);
    expect(garden[0]?.ornament).toBe(OAKS);
  });

  it('keeps each piece where it is as more chapters are finished', () => {
    const boxes = hubBoxes(true);
    const full = hubGarden(ALL, boxes);
    expect(full.map(({ chapter }) => chapter)).toEqual([...ALL]);
    for (const chapter of ALL) {
      expect(hubGarden(new Set([chapter]), boxes)).toEqual(
        full.filter((piece) => piece.chapter === chapter),
      );
    }
  });

  it.each([false, true])(
    'never covers a sign, a title or a button, nor another piece (stars: %s)',
    (stars) => {
      const boxes = hubBoxes(stars);
      const full = hubGarden(ALL, boxes);
      // Every chapter's piece finds room, in a bed along the bottom of the canvas.
      expect(full).toHaveLength(8);
      full.forEach((piece, i) => {
        expect(piece.y + piece.ornament.height).toBe(CANVAS_HEIGHT);
        const box = boxOf(piece);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(CANVAS_WIDTH);
        expect(box.y + box.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
        for (const other of boxes) expect(boxesOverlap(box, other, 0)).toBe(false);
        for (const other of full.slice(i + 1))
          expect(boxesOverlap(box, boxOf(other), 0)).toBe(false);
      });
    },
  );

  it('leaves a piece out rather than cover the hub when there is no room for it', () => {
    const everywhere: Rect = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    expect(hubGarden(ALL, [everywhere])).toEqual([]);
  });

  it("puts each chapter's sign at the margin, on the line of its title", () => {
    expect(signBox(40, 14)).toEqual({
      x: HUB.margin,
      y: 39,
      width: HUB_SIGN.width,
      height: HUB_SIGN.width,
    });
  });
});
