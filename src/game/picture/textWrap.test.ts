import { describe, expect, it } from 'vitest';
import { PIXEL_FONT } from './pixelFont';
import { charsIn, LINE_HEIGHT, textHeight, wrappedLines } from './textWrap';

describe('how a text wraps in the pixel font', () => {
  it('wraps word by word, greedily, and never breaks a word', () => {
    expect(wrappedLines('una dos tres', 7)).toBe(2);
    expect(wrappedLines('una dos tres', 12)).toBe(1);
    expect(wrappedLines('una dos tres', 11)).toBe(2);
    expect(wrappedLines('larguísima', 3)).toBe(1);
    expect(wrappedLines('', 10)).toBe(1);
  });

  it('a width holds as many letters as whole cells of the monospaced font fit in it', () => {
    expect(charsIn(10 * PIXEL_FONT.advance)).toBe(10);
    expect(charsIn(10 * PIXEL_FONT.advance - 1)).toBe(9);
  });

  it('a wrapped text is as tall as its lines', () => {
    expect(LINE_HEIGHT).toBe(PIXEL_FONT.ascent + PIXEL_FONT.descent);
    expect(textHeight('una dos tres', 7 * PIXEL_FONT.advance)).toBe(2 * LINE_HEIGHT);
  });
});
