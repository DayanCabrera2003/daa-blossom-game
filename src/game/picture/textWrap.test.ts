import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PIXEL_FONT } from './pixelFont';
import { charsIn, LINE_HEIGHT, textHeight, wrappedLines, wrapText } from './textWrap';

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

describe('the lines of a wrapped text', () => {
  it('gives the lines themselves, word by word, a long word on a line of its own', () => {
    expect(wrapText('una dos tres', 7)).toEqual(['una dos', 'tres']);
    expect(wrapText('una dos tres', 12)).toEqual(['una dos tres']);
    expect(wrapText('larguísima y ya', 3)).toEqual(['larguísima', 'y', 'ya']);
    expect(wrapText('', 10)).toEqual(['']);
  });

  it('takes as many lines as wrappedLines counts, and loses no word', () => {
    const words = fc.array(fc.stringMatching(/^[a-zñá]{1,9}$/), { minLength: 1, maxLength: 12 });
    fc.assert(
      fc.property(words, fc.integer({ min: 1, max: 30 }), (list, chars) => {
        const text = list.join(' ');
        const lines = wrapText(text, chars);
        expect(lines).toHaveLength(wrappedLines(text, chars));
        expect(lines.join(' ')).toBe(text);
        for (const line of lines) {
          if (line.includes(' ')) expect([...line].length).toBeLessThanOrEqual(chars);
        }
      }),
    );
  });
});
