import type Phaser from 'phaser';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from './layout';
import { textStyle } from './textStyle';

/** How long a message stays before fading, in milliseconds. */
const VISIBLE_MS = 2600;

/**
 * Gentle feedback above the toolbar: why a move was refused, in the garden's words (never a code,
 * never a punishment). A new message replaces the previous one.
 */
export class ToastView {
  private readonly text: Phaser.GameObjects.Text;
  private fade: Phaser.Tweens.Tween | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add
      .text(CANVAS_WIDTH / 2, LAYOUT.toastY, '', {
        ...textStyle(8),
        backgroundColor: '#2e2a24',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(150)
      .setAlpha(0);
  }

  show(message: string): void {
    this.fade?.stop();
    this.text.setText(message).setAlpha(1);
    this.fade = this.scene.tweens.add({
      targets: this.text,
      alpha: 0,
      delay: VISIBLE_MS,
      duration: 400,
    });
  }
}
