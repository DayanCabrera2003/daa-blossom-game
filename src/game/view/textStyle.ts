import type Phaser from 'phaser';
import { css, PALETTE } from './palette';

/**
 * Greybox text: a small monospace face. The canvas is 480×270 pixels scaled up, so a text is as
 * many canvas pixels high as its size: below 8 it stops being legible (GDD §4.1 sets 8 as the
 * smallest size). The pixel font of the final game is chosen at the art phase.
 */
export function textStyle(
  size = 8,
  colour: number = PALETTE.label,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: 'monospace', fontSize: `${size}px`, color: css(colour), resolution: 8 };
}
