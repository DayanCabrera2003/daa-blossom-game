import { describe, expect, it } from 'vitest';
import type { CreditLine } from '../assets/creditsModel';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import {
  CREDITS_ROLL,
  offsetAt,
  pageStarts,
  pageAfter,
  pageBefore,
  rollLines,
  rollTravel,
  scrolled,
  timeAt,
} from './creditsRoll';
import { PIXEL_FONT } from './pixelFont';

const text = (value: string): CreditLine => ({ style: 'text', text: value });

describe('where the roll sits on the screen', () => {
  const { panel, window: view } = CREDITS_ROLL;

  it('keeps the panel on the canvas and the window inside the panel', () => {
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(CANVAS_WIDTH);
    expect(view.x).toBeGreaterThan(panel.x);
    expect(view.y).toBeGreaterThan(panel.y);
    expect(view.x + view.width).toBeLessThan(panel.x + panel.width);
    expect(view.y + view.height).toBeLessThan(panel.y + panel.height);
  });

  it('leaves a row under the panel for the way back, on the canvas', () => {
    expect(CREDITS_ROLL.backRow).toBeGreaterThan(panel.y + panel.height);
    expect(CREDITS_ROLL.backRow + 14).toBeLessThanOrEqual(CANVAS_HEIGHT);
  });
});

describe('the lines of the roll', () => {
  it('stacks the lines from the top, each as tall as its size, a gap one body line', () => {
    const lines = rollLines(
      [
        { style: 'title', text: 'Florecer' },
        text('firma'),
        { style: 'gap' },
        { style: 'heading', text: 'Arte' },
        { style: 'name', text: 'Tiny Town' },
      ],
      300,
    );
    expect(lines.map((line) => [line.top, line.height])).toEqual([
      [0, 36],
      [36, 12],
      [60, 24],
      [84, 12],
    ]);
    expect(lines.map((line) => line.scale)).toEqual([3, 1, 2, 1]);
  });

  it('centres each line in the window, by its width in the monospaced font', () => {
    const [line] = rollLines([text('abcd')], 100);
    expect(line?.width).toBe(4 * PIXEL_FONT.advance);
    expect(line?.x).toBe((100 - 24) / 2);
    const [big] = rollLines([{ style: 'title', text: 'ab' }], 100);
    expect(big?.width).toBe(2 * 3 * PIXEL_FONT.advance);
    expect(big?.x).toBe(32);
  });

  it('wraps a long text into lines that fit the window, word by word', () => {
    const lines = rollLines([text('una dos tres cuatro')], 8 * PIXEL_FONT.advance);
    expect(lines.map((line) => line.text)).toEqual(['una dos', 'tres', 'cuatro']);
    for (const line of lines) expect(line.width).toBeLessThanOrEqual(8 * PIXEL_FONT.advance);
  });

  it('travels the height the lines leave under the window, and nothing if they fit', () => {
    const lines = rollLines([text('a'), text('b'), text('c')], 100);
    expect(rollTravel(lines, 20)).toBe(16);
    expect(rollTravel(lines, 36)).toBe(0);
    expect(rollTravel([], 36)).toBe(0);
  });
});

describe('the roll in time', () => {
  const { durationMs, holdMs } = CREDITS_ROLL;

  it('lasts what the music of the credits lasts, holding the title still first', () => {
    expect(durationMs).toBe(68_000);
    expect(holdMs).toBeGreaterThan(0);
    expect(holdMs).toBeLessThan(durationMs / 4);
  });

  it('stays at the top while it holds, then moves down to the end and stays there', () => {
    expect(offsetAt(0, 400)).toBe(0);
    expect(offsetAt(holdMs, 400)).toBe(0);
    expect(offsetAt((holdMs + durationMs) / 2, 400)).toBe(200);
    expect(offsetAt(durationMs, 400)).toBe(400);
    expect(offsetAt(durationMs * 3, 400)).toBe(400);
  });

  it('moves by whole pixels, never back', () => {
    let last = 0;
    for (let ms = 0; ms <= durationMs; ms += 97) {
      const offset = offsetAt(ms, 333);
      expect(Number.isInteger(offset)).toBe(true);
      expect(offset).toBeGreaterThanOrEqual(last);
      last = offset;
    }
  });

  it('tells the instant of an offset, so a jump goes on rolling from there', () => {
    for (const offset of [0, 1, 100, 250, 400])
      expect(offsetAt(timeAt(offset, 400), 400)).toBe(offset);
    expect(timeAt(0, 400)).toBe(0);
    expect(timeAt(400, 400)).toBe(durationMs);
    expect(timeAt(0, 0)).toBe(durationMs);
  });
});

describe('the roll by hand', () => {
  it('scrolls by a step, never out of the roll', () => {
    expect(scrolled(10, 12, 100)).toBe(22);
    expect(scrolled(95, 12, 100)).toBe(100);
    expect(scrolled(5, -12, 100)).toBe(0);
  });

  describe('pages, which never cut a line', () => {
    // Ten lines of 12 pixels in a window of 50: four lines fit whole on each page.
    const lines = rollLines(
      Array.from({ length: 10 }, (_, i) => text(`linea ${i}`)),
      200,
    );
    const travel = rollTravel(lines, 50);
    const pages = pageStarts(lines, 50, travel);

    it('start at a line that the page before could not show whole, and end at the end', () => {
      expect(travel).toBe(70);
      expect(pages).toEqual([0, 48, 70]);
    });

    it('turn forward and back, and say when there is no page after or before', () => {
      expect(pageAfter(0, pages)).toBe(48);
      expect(pageAfter(30, pages)).toBe(48);
      expect(pageAfter(48, pages)).toBe(70);
      expect(pageAfter(70, pages)).toBeNull();
      expect(pageBefore(70, pages)).toBe(48);
      expect(pageBefore(50, pages)).toBe(48);
      expect(pageBefore(0, pages)).toBeNull();
    });

    it('a roll that fits has a single page', () => {
      expect(pageStarts(lines.slice(0, 2), 50, 0)).toEqual([0]);
    });

    it('a line taller than the window still moves the page on', () => {
      const tall = rollLines([{ style: 'title', text: 'a' }, text('b')], 200);
      expect(pageStarts(tall, 20, rollTravel(tall, 20))).toEqual([0, 28]);
    });
  });
});
