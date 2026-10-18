import type { CreditLine, CreditStyle } from '../assets/creditsModel';
import { fontMetrics, PIXEL_FONT } from './pixelFont';
import { charsIn, LINE_HEIGHT, wrapText } from './textWrap';

/**
 * The credits' roll (plan 09, phase 3), decided without Phaser: where the panel and its window
 * stand, where each line of the credits sits on the roll, how far the roll has moved at an instant
 * of the music, and the pages a player turns by hand. The roll holds the title still for a moment,
 * then moves slowly for as long as the credits' music plays and stops with its last line in view.
 * With reduced motion it does not move by itself: it is read page by page. Every offset is a whole
 * pixel, so the letters never fall between pixels.
 */

/** A rectangle of the canvas, in logical pixels. */
interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const CREDITS_ROLL: {
  readonly panel: Box;
  readonly window: Box;
  readonly backRow: number;
  readonly durationMs: number;
  readonly holdMs: number;
} = {
  /** The wooden panel the roll is written on, centred on the canvas. */
  panel: { x: 60, y: 6, width: 360, height: 240 },
  /** The part of the panel the roll shows, inside its frame with some air. */
  window: { x: 70, y: 16, width: 340, height: 220 },
  /** The top of the row under the panel: the way back and the keys. */
  backRow: 252,
  /** How long the music of the credits plays (`music.credits`, 68 s): the roll lasts as long. */
  durationMs: 68_000,
  /** How long the title stays still before the roll moves. */
  holdMs: 4_000,
};

/** How many times the native size of the font each style is drawn at. */
const SCALE: Readonly<Record<CreditStyle, number>> = { title: 3, heading: 2, name: 1, text: 1 };

/** A line of the roll: its text, how it is drawn, and its place from the roll's top-left corner. */
export interface RollLine {
  readonly text: string;
  readonly style: CreditStyle;
  /** How many times the native size of the font it is drawn at. */
  readonly scale: number;
  /** From the window's left edge to the line's, so the line is centred. */
  readonly x: number;
  /** From the top of the roll to the top of the line. */
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The credits' lines laid on a roll `width` pixels wide: each text wrapped at the letters its size
 * fits, each line centred and stacked under the one before, a gap as tall as a line of body text.
 */
export function rollLines(lines: readonly CreditLine[], width: number): RollLine[] {
  const laid: RollLine[] = [];
  let top = 0;
  for (const line of lines) {
    if (line.style === 'gap') {
      top += LINE_HEIGHT;
      continue;
    }
    const scale = SCALE[line.style];
    const height = fontMetrics(8 * scale).fontSize;
    for (const text of wrapText(line.text, charsIn(width / scale))) {
      const textWidth = [...text].length * PIXEL_FONT.advance * scale;
      laid.push({
        text,
        style: line.style,
        scale,
        x: Math.floor((width - textWidth) / 2),
        top,
        width: textWidth,
        height,
      });
      top += height;
    }
  }
  return laid;
}

/** How far the roll moves: what of it is left under a window `height` tall, or nothing. */
export function rollTravel(lines: readonly RollLine[], height: number): number {
  const last = lines.at(-1);
  return last === undefined ? 0 : Math.max(0, last.top + last.height - height);
}

/** The time the roll moves, after the title's hold. */
const MOVING_MS = CREDITS_ROLL.durationMs - CREDITS_ROLL.holdMs;

/**
 * How far a roll that travels `travel` pixels has moved `ms` after it began: nothing while the
 * title holds, then evenly to the end, which it reaches as the music ends and keeps.
 */
export function offsetAt(ms: number, travel: number): number {
  const along = Math.min(1, Math.max(0, (ms - CREDITS_ROLL.holdMs) / MOVING_MS));
  return Math.round(travel * along);
}

/**
 * The instant a roll is at `offset`, so a roll moved by hand goes on from there: the start for the
 * top, the end of the music for the end (and for a roll that does not move).
 */
export function timeAt(offset: number, travel: number): number {
  if (travel <= 0) return CREDITS_ROLL.durationMs;
  if (offset <= 0) return 0;
  return CREDITS_ROLL.holdMs + (Math.min(offset, travel) / travel) * MOVING_MS;
}

/** The offset `step` pixels from `offset` (up when negative), never out of the roll. */
export const scrolled = (offset: number, step: number, travel: number): number =>
  Math.min(travel, Math.max(0, offset + step));

/**
 * Where each page of the roll starts, for a window `height` tall: the first at the top, each next
 * at the first line the page before could not show whole, and the last at the end of the roll. A
 * line taller than the window still moves the pages on.
 */
export function pageStarts(lines: readonly RollLine[], height: number, travel: number): number[] {
  const pages = [0];
  for (let start = 0; start < travel;) {
    const cut = lines.find((line) => line.top > start && line.top + line.height > start + height);
    start = Math.min(travel, cut?.top ?? travel);
    pages.push(start);
  }
  return pages;
}

/** The start of the page after the one at `offset`, or null at the last page. */
export const pageAfter = (offset: number, pages: readonly number[]): number | null =>
  pages.find((start) => start > offset) ?? null;

/** The start of the page before the one at `offset`, or null at the first page. */
export const pageBefore = (offset: number, pages: readonly number[]): number | null =>
  [...pages].reverse().find((start) => start < offset) ?? null;

/** What of a line the window shows: where it is drawn and which rows of it, from its top. */
export interface LineClip {
  /** From the window's top to the line's top, above the window when negative. */
  readonly y: number;
  readonly cropTop: number;
  readonly cropHeight: number;
}

/** What of `line` a window `height` tall shows with the roll at `offset`; null if nothing. */
export function lineClip(line: RollLine, offset: number, height: number): LineClip | null {
  const y = line.top - offset;
  if (y + line.height <= 0 || y >= height) return null;
  const cropTop = Math.max(0, -y);
  return { y, cropTop, cropHeight: Math.min(line.height, height - y) - cropTop };
}
