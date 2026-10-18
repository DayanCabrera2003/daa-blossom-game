import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { cardFrameAt } from '../animation/cardLoop';
import { playUiSound } from '../audio/uiSound';
import type { CardLoop } from '../picture/cardDemo';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { CardDemoView, DEMO_SIZE } from './CardDemoView';
import { innerWidth, PANEL, TUTORIAL_PANEL, tutorialLayout } from '../picture/panelLayout';
import { cardSpots } from '../picture/panelSpots';
import type { Point } from '../input/target';
import { WOOD_PANEL } from '../picture/wood';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';
import { coverWith } from './focusables';
import { PanelGrip } from './PanelGrip';
import { placePanel } from './panelPlacer';
import { shiftParts } from './shiftParts';

/** A mechanic card as the window shows it: its texts, already translated, and what it loops. */
export interface ShownCard {
  readonly title: string;
  readonly body: string;
  readonly loop: CardLoop;
}

/** How often the demo checks whether its next frame is due, in milliseconds. */
const TICK_MS = 100;
/** Depths: the blocker over the garden, then the window and what is on it (above questions). */
const BLOCKER_DEPTH = 160;
const PANEL_DEPTH = 260;

/**
 * The wooden window of a mechanic card (GDD §5.11; laid out by `picture/panelLayout.ts`): a title,
 * two or three lines about the gesture, the card's tiny garden doing the gesture by itself in a
 * loop, and "Entendido", which closes it. A dim layer over the garden takes every touch meant for
 * it while the window is open. The window opens clear of the garden and is dragged by its frame
 * (the post-release fix of plan 09).
 */
export class TutorialView {
  private parts: { destroy(): void }[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;
  /** What "Entendido" does on the window open now, for Escape to do the same. */
  private dismissal: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
  ) {}

  /** Whether a card is on screen. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /** Does what "Entendido" does (Escape on the card): closes it and runs its `onClose`. */
  dismiss(): void {
    this.dismissal?.();
  }

  /**
   * Opens the window; `onClose` runs once the player presses "Entendido". It opens where the
   * player last dropped a card, or else where it hides least of the garden; `quiet` opens it again
   * without its sound (the player sent it back to its place).
   */
  show(card: ShownCard, onClose: () => void, quiet = false): void {
    this.clear();
    const { scene } = this;
    if (!quiet) playUiSound(scene, 'sfx.card');
    const { x, y, width } = TUTORIAL_PANEL;
    const left = x + PANEL.pad;
    const ink = PALETTE[WOOD_PANEL.text];
    const blocker = coverWith(
      scene.add
        .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.4)
        .setOrigin(0, 0)
        .setDepth(BLOCKER_DEPTH)
        .setInteractive(),
    );
    const title = scene.add
      .text(left, y + PANEL.pad, card.title, textStyle(10, ink))
      .setDepth(PANEL_DEPTH + 1);
    const body = scene.add
      .text(left, 0, card.body, {
        ...textStyle(8, ink),
        wordWrap: { width: innerWidth(width) },
      })
      .setDepth(PANEL_DEPTH + 1);
    // Laid out once the body is measured: the demo under it, the button under the demo.
    const layout = tutorialLayout(body.height, DEMO_SIZE.height);
    body.setY(layout.bodyY);
    const demo = new CardDemoView(
      scene,
      { x: x + (width - DEMO_SIZE.width) / 2, y: layout.demoY },
      PANEL_DEPTH + 2,
      this.t,
    );
    this.dismissal = () => {
      this.close();
      onClose();
    };
    const button = new Button(scene, 0, 0, this.t('tutorial.ok'), this.dismissal).setDepth(
      PANEL_DEPTH + 4,
    );
    button.moveTo(x + (width - button.width) / 2, layout.buttonY + 1);
    const panel = new WoodFrame(
      scene,
      WOOD_PANEL,
      { x, y, width, height: layout.height },
      PANEL_DEPTH,
    );
    // The demo loops for as long as the window is open, repainted only when its frame changes.
    const opened = scene.time.now;
    let shown = -1;
    const paint = (): void => {
      const frame = cardFrameAt(card.loop.frames, scene.time.now - opened);
      if (frame === shown) return;
      shown = frame;
      demo.render(card.loop.pictureAt(frame));
    };
    // Laid out where it always opened, then moved where the player left it or where it hides
    // least of the garden (`view/panelPlacer.ts`); a move paints the demo again where it went.
    const moving = [title, body, demo, button, panel];
    const moveTo = (at: Point): void => {
      shiftParts(moving, at.x - panel.bounds.x, at.y - panel.bounds.y);
      shown = -1;
      paint();
    };
    moveTo(placePanel(scene, 'card', cardSpots(layout.height)));
    const grip = new PanelGrip(
      scene,
      {
        kind: 'card',
        frame: () => panel.bounds,
        handles: () => [button.bounds],
        moveTo,
        reset: () => this.show(card, onClose, true),
      },
      PANEL_DEPTH + 1,
    );
    panel.zone
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => grip.grab(pointer));
    this.parts.push(blocker, title, body, demo, button, panel, grip);
    this.timer = scene.time.addEvent({ delay: TICK_MS, loop: true, callback: paint });
  }

  /** Takes the window, its demo and its blocker away, sounding the panel closing if it was open. */
  close(): void {
    if (this.parts.length > 0) playUiSound(this.scene, 'sfx.panelClose');
    this.clear();
  }

  /** Takes the window, its demo and its blocker away, silently. */
  private clear(): void {
    this.dismissal = null;
    this.timer?.remove();
    this.timer = null;
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
