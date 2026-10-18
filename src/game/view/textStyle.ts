import type Phaser from 'phaser';
import { fontMetrics, fontSize, PIXEL_FONT } from '../picture/pixelFont';
import { css, PALETTE } from './palette';
import { renderZoom } from './renderZoom';

/**
 * Text in the pixel font (monogram extended, plan 06 section 1.2). `size` is what the views ask
 * for, 8 being body text (GDD §4.1); it is drawn at a whole multiple of the font's native size
 * (`picture/pixelFont.ts`), so each font pixel covers whole logical pixels. It is
 * rasterised at the drawing zoom, so each logical pixel of a letter gets the real pixels it covers
 * on screen and the text stays sharp. Every line is as tall as the font's own measures say, so a
 * layout can count lines. Until the page has loaded the font, monospace stands in.
 */
export function textStyle(
  size = 8,
  colour: number = PALETTE.label,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: `${PIXEL_FONT.family}, monospace`,
    fontSize: `${fontSize(size)}px`,
    metrics: fontMetrics(size),
    color: css(colour),
    resolution: renderZoom(),
  };
}
