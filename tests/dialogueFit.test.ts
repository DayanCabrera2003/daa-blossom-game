import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import { fontMetrics, PIXEL_FONT } from '../src/game/picture/pixelFont';
import { LAYOUT } from '../src/game/view/layout';

// Every dialogue line fits its box in the pixel font: wrapped at the box's width the way the
// engine wraps (word by word, greedily), its lines end above the "continue" hint at the bottom.

const { width, height, padX, padY } = LAYOUT.dialogue;
const LINE = fontMetrics(8).fontSize;
const CHARS_PER_LINE = Math.floor((width - 2 * padX) / PIXEL_FONT.advance);

/** How many lines `text` takes when wrapped word by word at `chars` characters. */
function wrappedLines(text: string, chars: number): number {
  let count = 1;
  let used = 0;
  for (const word of text.split(' ')) {
    const needed = used === 0 ? word.length : used + 1 + word.length;
    if (needed <= chars || used === 0) used = needed;
    else {
      count += 1;
      used = word.length;
    }
  }
  return count;
}

describe('dialogue lines fit their box', () => {
  it('wraps a text word by word', () => {
    expect(wrappedLines('una dos tres', 7)).toBe(2);
    expect(wrappedLines('una dos tres', 12)).toBe(1);
    expect(wrappedLines('larguísima', 3)).toBe(1);
  });

  it('leaves room under the text for the hint, a line high, at the bottom', () => {
    const rows = Math.max(
      ...Object.values(lines).map((text) => wrappedLines(text, CHARS_PER_LINE)),
    );
    // The hint sits 3 px above the bottom edge.
    expect(padY + rows * LINE).toBeLessThanOrEqual(height - 3 - LINE);
  });
});
