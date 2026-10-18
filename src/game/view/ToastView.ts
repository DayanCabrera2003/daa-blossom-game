import type Phaser from 'phaser';
import { toastSpots } from '../picture/panelSpots';
import { TOAST, toastBox } from '../picture/toastBox';
import { WOOD_PANEL } from '../picture/wood';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { PanelGrip } from './PanelGrip';
import { placePanel } from './panelPlacer';
import { shiftParts } from './shiftParts';
import { WoodFrame } from './WoodFrame';

/** How long a message stays before fading, in milliseconds. */
const VISIBLE_MS = 2600;
/** The depth of the toast (`picture/toastBox.ts`). */
const DEPTH = TOAST.depth;

/**
 * Gentle feedback above the toolbar, on a small wooden panel: why a move was refused, in the
 * garden's words (never a code, never a punishment). A new message replaces the previous one, and
 * each is said whole to a screen reader through `say`. A toast shows clear of the garden and can be
 * dragged away while it shows (the post-release fix of plan 09).
 */
export class ToastView {
  private readonly text: Phaser.GameObjects.Text;
  /** The toast's wood and its grip, while it shows. */
  private shown: { readonly wood: WoodFrame; readonly grip: PanelGrip } | null = null;
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
   * that covers it (the free mode's generate menu). A message that wraps grows upwards. It shows
   * where the player last dropped a toast, or else where it hides least of the garden; while a
   * finger holds it, it stays in sight.
   */
  show(message: string, bottom: number = TOAST.bottom): void {
    this.takeAway();
    this.text.setText(message).setAlpha(1);
    this.say(message);
    // The panel is sized to the message, its border around the text (`picture/toastBox.ts`).
    const box = placePanel(
      this.scene,
      'toast',
      toastSpots(toastBox(this.text.width, this.text.height, bottom)),
    );
    this.text.setPosition(box.x + box.width / 2, box.y + box.height / 2);
    const wood = new WoodFrame(
      this.scene,
      WOOD_PANEL,
      { x: box.x, y: box.y, width: box.width, height: box.height },
      DEPTH,
    );
    const grip = new PanelGrip(
      this.scene,
      {
        kind: 'toast',
        frame: () => wood.bounds,
        moveTo: (at) => shiftParts([wood, this.text], at.x - wood.bounds.x, at.y - wood.bounds.y),
        reset: () => this.show(message, bottom),
        held: (on) => (on ? this.hold() : this.fadeLater()),
      },
      DEPTH + 1,
    );
    wood.zone
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => grip.grab(pointer));
    this.shown = { wood, grip };
    this.fadeLater();
  }

  /** A finger holds the toast: it stops fading and shows whole. */
  private hold(): void {
    this.fade?.stop();
    this.fade = null;
    this.setAlpha(1);
  }

  /** The toast fades away after it has been read, and then goes. */
  private fadeLater(): void {
    this.fade?.stop();
    const shown = { alpha: 1 };
    this.setAlpha(1);
    this.fade = this.scene.tweens.add({
      targets: shown,
      alpha: 0,
      delay: VISIBLE_MS,
      duration: 400,
      onUpdate: () => this.setAlpha(shown.alpha),
      onComplete: () => this.takeAway(),
    });
  }

  /** Fades the text, the wood and the grip together. */
  private setAlpha(alpha: number): void {
    this.text.setAlpha(alpha);
    this.shown?.wood.setAlpha(alpha);
    this.shown?.grip.setAlpha(alpha);
  }

  /** Takes the toast away, so it takes no touch once it is gone. */
  private takeAway(): void {
    this.fade?.stop();
    this.fade = null;
    this.shown?.grip.destroy();
    this.shown?.wood.destroy();
    this.shown = null;
    this.text.setAlpha(0);
  }
}
