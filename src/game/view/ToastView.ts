import type Phaser from 'phaser';
import { PANEL } from '../picture/panelLayout';
import { WOOD_PANEL } from '../picture/wood';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from './layout';
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
      .text(CANVAS_WIDTH / 2, LAYOUT.toastY, '', {
        ...textStyle(8, PALETTE[WOOD_PANEL.text]),
        wordWrap: { width: CANVAS_WIDTH - 4 * PANEL.pad },
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH + 1)
      .setAlpha(0);
  }

  /**
   * Shows `message`, its panel centred on `centreY`: above the toolbar by default, or above a
   * drawer that covers it (the free mode's generate menu).
   */
  show(message: string, centreY: number = LAYOUT.toastY): void {
    this.fade?.stop();
    this.wood?.destroy();
    this.text.setText(message).setY(centreY).setAlpha(1);
    this.say(message);
    // The panel is sized to the message, its border around the text.
    const width = Math.round(this.text.width) + 2 * PANEL.pad;
    const height = Math.round(this.text.height) + 2 * PANEL.pad - 4;
    const wood = new WoodFrame(
      this.scene,
      WOOD_PANEL,
      {
        x: Math.round((CANVAS_WIDTH - width) / 2),
        y: Math.round(centreY - height / 2),
        width,
        height,
      },
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
