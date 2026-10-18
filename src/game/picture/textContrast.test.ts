import { describe, expect, it } from 'vitest';
import { blend, MIN_TEXT_CONTRAST, TEXTS, textReads } from './textContrast';

describe('the arithmetic of text on its ground', () => {
  it('blends a colour over another channel by channel, as the canvas does', () => {
    expect(blend(0xffffff, 1, 0x000000)).toBe(0xffffff);
    expect(blend(0xffffff, 0, 0x123456)).toBe(0x123456);
    expect(blend(0xff0000, 0.5, 0x0000ff)).toBe(0x800080);
  });

  it('reads a text on the worst of the grounds it may lie on', () => {
    expect(textReads(0xffffff, [0x000000])).toBeCloseTo(21);
    expect(textReads(0xffffff, [0x000000, 0xffffff])).toBe(1);
  });

  it('holds body text to the contrast WCAG asks of it', () => {
    expect(MIN_TEXT_CONTRAST).toBe(4.5);
  });

  it('lists each text once, by its file and what it is', () => {
    const named = TEXTS.map(({ file, what }) => `${file} ${what}`);
    expect(new Set(named).size).toBe(named.length);
  });
});
