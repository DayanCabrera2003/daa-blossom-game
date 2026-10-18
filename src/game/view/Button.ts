import type Phaser from 'phaser';
import type { PixelRect } from '../assets/frames';
import { playUiSound } from '../audio/uiSound';
import { badgeAt, buttonContent, ICON_GAP, type ButtonIcon } from '../picture/buttonIcon';
import { WOOD_BUTTON, type ButtonState } from '../picture/wood';
import { addFocusable } from './focusables';
import { growTouchZone } from './touchZone';
import { css, PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/**
 * A small button of the HUD and the panels: a label, maybe after icons (the first maybe wearing a
 * badge on its corner, `picture/buttonIcon.ts`), on a wooden button of the pack
 * (`picture/wood.ts`), at rest, in hand or switched off, its letters in the colour that reads on
 * each look. A press clicks, unless the button is switched off; a touch counts a little round the
 * wood too (`view/touchZone.ts`). The keyboard's focus reaches it
 * while it is shown and switched on, and Enter or Space on it press it the same way
 * (`view/focusables.ts`).
 */
export class Button {
  private readonly wood: WoodFrame;
  private readonly text: Phaser.GameObjects.Text;
  private readonly icons: Phaser.GameObjects.Image[];
  /** The badge on the first icon's corner, if it has one and both pictures are loaded. */
  private readonly badge: Phaser.GameObjects.Image | null;
  /** The width the icons and their gaps take before the label. */
  private readonly iconRoom: number;
  private readonly onPress: () => void;
  private enabled = true;
  private active = false;
  private visible = true;
  private destroyed = false;
  /** The depth of its wood, which the keyboard's focus reads to know what is drawn above it. */
  private depth = 100;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onPress: () => void,
    icons: readonly ButtonIcon[] = [],
    badge: ButtonIcon | null = null,
  ) {
    this.onPress = onPress;
    // An icon whose picture is not loaded is left out.
    this.icons = icons
      .filter((icon) => scene.textures.exists(icon.texture))
      .map((icon) =>
        scene.add.image(0, 0, icon.texture).setOrigin(0, 0).setScale(icon.scale).setDepth(101),
      );
    this.badge =
      badge !== null && this.icons.length > 0 && scene.textures.exists(badge.texture)
        ? scene.add.image(0, 0, badge.texture).setOrigin(0, 0).setScale(badge.scale).setDepth(102)
        : null;
    this.text = scene.add.text(0, 0, label, textStyle()).setOrigin(0, 0).setDepth(101);
    this.iconRoom = this.icons.reduce((room, icon) => room + icon.displayWidth + ICON_GAP, 0);
    this.wood = new WoodFrame(
      scene,
      WOOD_BUTTON.idle,
      {
        x: x - 2,
        y: y - 1,
        width: this.iconRoom + this.text.width + 4,
        height: this.text.height + 2,
      },
      100,
      PALETTE.button,
    );
    this.wood.zone
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.press();
        },
      );
    this.moveTo(x, y);
    this.restyle();
    const focusable = {
      box: () => this.wood.bounds,
      depth: () => this.depth,
      live: () => this.visible && this.enabled && !this.destroyed,
      press: () => this.press(),
    };
    addFocusable(scene, focusable);
    // A finger may land a little off the wood: the button takes touches round it too.
    growTouchZone(this.wood.zone, focusable);
  }

  /** What a touch does, and Enter or Space on the button in focus: it clicks, unless switched off. */
  press(): void {
    if (!this.enabled) return;
    playUiSound(this.scene, 'sfx.button');
    this.onPress();
  }

  /** The rectangle of its wood on the canvas, which a drag of its panel never starts on. */
  get bounds(): PixelRect {
    return this.wood.bounds;
  }

  /** Width on the canvas, to lay buttons out side by side. */
  get width(): number {
    return this.wood.bounds.width;
  }

  /** Height on the canvas, to lay rows of buttons out. */
  get height(): number {
    return this.wood.bounds.height;
  }

  /** Moves the button so that its panel's top-left corner is at (x, y). */
  moveTo(x: number, y: number): this {
    const { width, height } = this.wood.bounds;
    this.wood.setRect({ x, y: y - 1, width, height });
    // Each icon is centred on the button's height, the label after them.
    const content = buttonContent(
      x,
      y,
      height,
      this.icons.map((icon) => ({ width: icon.displayWidth, height: icon.displayHeight })),
    );
    this.icons.forEach((icon, i) => {
      const at = content.icons[i];
      if (at !== undefined) icon.setPosition(at.x, at.y);
    });
    const [first] = content.icons;
    if (this.badge !== null && first !== undefined) {
      const at = badgeAt(first, this.badge.displayWidth);
      this.badge.setPosition(at.x, at.y);
    }
    this.text.setPosition(content.labelX, y);
    return this;
  }

  /** Moves the button by (dx, dy) with the panel that holds it. */
  shift(dx: number, dy: number): this {
    const { x, y } = this.wood.bounds;
    return this.moveTo(x + dx, y + 1 + dy);
  }

  /**
   * Writes another label on the button, which grows or shrinks to it from its left edge (a hub
   * sign that gains or loses the room of its seal); its height stays.
   */
  setLabel(label: string): this {
    this.text.setText(label);
    const { x, y, height } = this.wood.bounds;
    this.wood.setRect({ x, y, width: this.iconRoom + this.text.width + 4, height });
    return this;
  }

  /** Puts the button above other layers (panels drawn on top of the HUD). */
  setDepth(depth: number): this {
    this.depth = depth;
    this.wood.setDepth(depth);
    for (const icon of this.icons) icon.setDepth(depth + 1);
    this.badge?.setDepth(depth + 2);
    this.text.setDepth(depth + 1);
    return this;
  }

  /** Switches the button off when its action is not available now. */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this.restyle();
  }

  /** Marks the button as the one in use (the tool in hand). */
  setActive(active: boolean): this {
    this.active = active;
    return this.restyle();
  }

  setVisible(visible: boolean): this {
    this.visible = visible;
    this.wood.setVisible(visible);
    for (const icon of this.icons) icon.setVisible(visible);
    this.badge?.setVisible(visible);
    this.text.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.destroyed = true;
    this.wood.destroy();
    for (const icon of this.icons) icon.destroy();
    this.badge?.destroy();
    this.text.destroy();
  }

  /** The look of the button now: off before in hand, in hand before at rest. */
  private get state(): ButtonState {
    if (!this.enabled) return 'off';
    return this.active ? 'active' : 'idle';
  }

  /** Draws the wood of the button's look and writes its label in the colour that reads on it. */
  private restyle(): this {
    const piece = WOOD_BUTTON[this.state];
    this.wood.setPiece(piece);
    this.text.setColor(css(PALETTE[piece.text]));
    for (const icon of this.icons) icon.setAlpha(this.enabled ? 1 : 0.5);
    this.badge?.setAlpha(this.enabled ? 1 : 0.5);
    return this;
  }
}
