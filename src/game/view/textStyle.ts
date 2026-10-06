import type Phaser from 'phaser';
import { css, PALETTE } from './palette';

/**
 * Greybox text: a small monospace face rendered at a high resolution so it stays sharp under the
 * whole-number zoom of the canvas. The pixel font of the final game is chosen at the art phase.
 */
export function textStyle(
  size = 8,
  colour: number = PALETTE.label,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: 'monospace', fontSize: `${size}px`, color: css(colour), resolution: 8 };
}
