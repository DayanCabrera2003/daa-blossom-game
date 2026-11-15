import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { fontMetrics, fontSize, PIXEL_FONT } from './pixelFont';
import { TITLE_SCREEN } from './titleScreen';

/** The box a centred line of `chars` characters asked at `size` covers, around `y`. */
const lineBox = (chars: number, size: number, y: number) => {
  const width = (chars * PIXEL_FONT.advance * fontSize(size)) / PIXEL_FONT.nativeSize;
  const height = fontMetrics(size).fontSize;
  return {
    x0: (CANVAS_WIDTH - width) / 2,
    x1: (CANVAS_WIDTH + width) / 2,
    y0: y - height / 2,
    y1: y + height / 2,
  };
};

describe('the title screen', () => {
  const title = lineBox(strings['hub.title'].length, TITLE_SCREEN.titleSize, TITLE_SCREEN.titleY);
  const prompt = lineBox(
    strings['title.start'].length,
    TITLE_SCREEN.promptSize,
    TITLE_SCREEN.promptY,
  );

  it('writes the name large, larger than the line under it', () => {
    expect(fontSize(TITLE_SCREEN.titleSize)).toBeGreaterThan(fontSize(TITLE_SCREEN.promptSize));
  });

  it('keeps both lines on the canvas, the prompt below the name with air between them', () => {
    for (const box of [title, prompt]) {
      expect(box.x0).toBeGreaterThanOrEqual(0);
      expect(box.x1).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(box.y0).toBeGreaterThanOrEqual(0);
      expect(box.y1).toBeLessThanOrEqual(CANVAS_HEIGHT);
    }
    expect(prompt.y0).toBeGreaterThan(title.y1);
  });
});
