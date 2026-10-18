import type Phaser from 'phaser';
import { TOAST, toastBox } from '../picture/toastBox';
import { WOOD_PANEL } from '../picture/wood';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/** How long a message stays before fading, in milliseconds. */
const VISIBLE_MS = 2600;
/** The depth of the toast: over the garden and the panels of the HUD, under the dialogue box. */
const DEPTH = 150;

/**
 * Gentle feedback above the toolbar, on a small wooden panel: why a move was refused, in the
 * garden's words (never a code, never a punishment). A new message replaces the previous one, and
 * each is said whole to a screen reader through `say`.
 */
export class ToastView {
  private readonly text: Phaser.GameObjects.Text;
  private wood: WoodFrame | null = null;
  private fade: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly say: (text: string) => void = () => undefined,
  ) {
    this.text = scene.add
      .text(CANVAS_WIDTH / 2, TOAST.bottom, '', {
        ...textStyle(8, PALETTE[WOOD_PANEL.text]),
        wordWrap: { width: TOAST.wrap },
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH + 1)
      .setAlpha(0);
  }

  /**
   * Shows `message`, its panel ending at `bottom`: above the toolbar by default, or above a drawer
   * that covers it (the free mode's generate menu). A message that wraps grows upwards.
   */
  show(message: string, bottom: number = TOAST.bottom): void {
    this.fade?.stop();
    this.wood?.destroy();
    this.text.setText(message).setAlpha(1);
    this.say(message);
    // The panel is sized to the message, its border around the text (`picture/toastBox.ts`).
    const box = toastBox(this.text.width, this.text.height, bottom);
    this.text.setY(box.textY);
    const wood = new WoodFrame(
      this.scene,
      WOOD_PANEL,
      { x: box.x, y: box.y, width: box.width, height: box.height },
      DEPTH,
    );
    this.wood = wood;
    const shown = { alpha: 1 };
    this.fade = this.scene.tweens.add({
      targets: shown,
      alpha: 0,
      delay: VISIBLE_MS,
      duration: 400,
      onUpdate: () => {
        this.text.setAlpha(shown.alpha);
        wood.setAlpha(shown.alpha);
      },
    });
  }
}
