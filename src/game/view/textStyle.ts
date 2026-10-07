import type Phaser from 'phaser';
import { css, PALETTE } from './palette';
import { renderZoom } from './renderZoom';

/**
 * Greybox text: a small monospace face, `size` logical pixels high (GDD §4.1 sets 8 as the
 * smallest). It is rasterised at the drawing zoom, so each logical pixel of a letter gets the
 * real pixels it covers on screen and the text stays sharp. The pixel font of the final game is
 * chosen at the art phase.
 */
export function textStyle(
  size = 8,
  colour: number = PALETTE.label,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'monospace',
    fontSize: `${size}px`,
    color: css(colour),
    resolution: renderZoom(),
  };
}
