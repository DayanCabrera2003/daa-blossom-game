import { describe, expect, it } from 'vitest';
import { BOOK, introHeight, linesOf, pageArea } from './bookLayout';

describe('the room a page of a book leaves for its text', () => {
  it('at the logical 480 x 270 of the canvas, the page keeps 251 x 198 logical pixels', () => {
    // The head is the only row besides the page (the book's name and its turns, the heading and
    // Cerrar), and the tabs sit on the page: what is left is the text of the page.
    expect(pageArea({ width: 480, height: 270 })).toEqual({ width: 251, height: 198 });
  });

  it('a window smaller than the book shrinks the page by as much', () => {
    expect(pageArea({ width: 440, height: 240 })).toEqual({ width: 227, height: 180 });
  });

  it('leaves more than two thirds of the height of the book to its text: the head never eats the page', () => {
    const page = pageArea({ width: BOOK.width, height: BOOK.height });
    expect(page.height).toBeGreaterThan((BOOK.height * 2) / 3);
  });
});

describe('the lines a text takes on the page, in the monospaced pixel font', () => {
  it('a short paragraph takes one line', () => {
    expect(linesOf('Un farol es para dos.', 41)).toBe(1);
  });

  it('words wrap whole, never cut', () => {
    // 41 characters fit: "aaaa…" of 30 and a word of 15 do not share a line.
    expect(linesOf(`${'a'.repeat(30)} ${'b'.repeat(15)}`, 41)).toBe(2);
    expect(linesOf(`${'a'.repeat(20)} ${'b'.repeat(20)}`, 41)).toBe(1);
  });

  it('a word longer than the line breaks over as many lines as it needs', () => {
    expect(linesOf('x'.repeat(90), 41)).toBe(3);
  });

  it('an empty text takes no line', () => {
    expect(linesOf('   ', 41)).toBe(0);
  });
});

describe('how far down the page a diagram starts', () => {
  it('each paragraph above it takes its lines and the space after a paragraph', () => {
    const width = 41 * BOOK.glyph;
    expect(introHeight(['Un farol es para dos.'], width)).toBe(BOOK.line + BOOK.paragraphGap);
    expect(introHeight(['uno', 'x'.repeat(50)], width)).toBe(3 * BOOK.line + 2 * BOOK.paragraphGap);
  });

  it('with nothing above it, it starts at the top', () => {
    expect(introHeight([], 251)).toBe(0);
  });
});
