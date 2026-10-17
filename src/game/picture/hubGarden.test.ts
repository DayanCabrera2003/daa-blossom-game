import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import { HUB, layoutHub } from './hubLayout';
import {
  finishedChapters,
  HUB_PIECES,
  HUB_SIGN,
  hubGarden,
  signBox,
  type HubPlanting,
} from './hubGarden';
import { OAKS, SOIL_PATCH } from './seasons';

/** The level counts of the hub today, by chapter. */
const COUNTS = [5, 9, 4, 9, 12, 5, 6, 5];
const BUTTON = { width: 28, height: 14 };

/** The boxes of a hub laid out as the scene lays it out: title, gear, signs, titles, buttons. */
function hubBoxes(): Rect[] {
  const titleWidths = COUNTS.map(() => 70 + HUB_SIGN.width + HUB_SIGN.gap);
  const layout = layoutHub(
    COUNTS.map((count) => Array.from({ length: count }, () => BUTTON.width)),
    BUTTON.height,
    titleWidths,
  );
  return [
    { x: HUB.margin, y: 6, width: 60, height: 12 },
    { x: CANVAS_WIDTH - HUB.margin - 14, y: 4, width: 14, height: 14 },
    { x: HUB.margin, y: HUB.exportY, width: 168, height: 14 },
    ...layout.chapters.flatMap(({ titleY, buttons }, c) => [
      signBox(titleY, BUTTON.height),
      { x: HUB.margin, y: titleY, width: titleWidths[c] ?? 0, height: BUTTON.height },
      ...buttons.map(({ x, y }) => ({ x, y, ...BUTTON })),
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
    expect(hubGarden(new Set(), hubBoxes())).toEqual([]);
  });

  it('plants the oaks once chapter 7 is finished', () => {
    const garden = hubGarden(new Set(['7']), hubBoxes());
    expect(garden.map(({ chapter }) => chapter)).toEqual(['7']);
    expect(garden[0]?.ornament).toBe(OAKS);
  });

  it('keeps each piece where it is as more chapters are finished', () => {
    const boxes = hubBoxes();
    const full = hubGarden(ALL, boxes);
    expect(full.map(({ chapter }) => chapter)).toEqual([...ALL]);
    for (const chapter of ALL) {
      expect(hubGarden(new Set([chapter]), boxes)).toEqual(
        full.filter((piece) => piece.chapter === chapter),
      );
    }
  });

  it('never covers a sign, a title or a button, nor another piece, and stays on the canvas', () => {
    const boxes = hubBoxes();
    const full = hubGarden(ALL, boxes);
    full.forEach((piece, i) => {
      const box = boxOf(piece);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(box.y + box.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
      for (const other of boxes) expect(boxesOverlap(box, other, 0)).toBe(false);
      for (const other of full.slice(i + 1)) expect(boxesOverlap(box, boxOf(other), 0)).toBe(false);
    });
  });

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
