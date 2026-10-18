import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { cardFrameAt } from '../animation/cardLoop';
import { playUiSound } from '../audio/uiSound';
import type { CardLoop } from '../picture/cardDemo';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { CardDemoView, DEMO_SIZE } from './CardDemoView';
import { innerWidth, PANEL, TUTORIAL_PANEL, tutorialLayout } from '../picture/panelLayout';
import { WOOD_PANEL } from '../picture/wood';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

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
 * it while the window is open.
 */
export class TutorialView {
  private parts: { destroy(): void }[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
  ) {}

  /** Opens the window; `onClose` runs once the player presses "Entendido". */
  show(card: ShownCard, onClose: () => void): void {
    this.clear();
    const { scene } = this;
    playUiSound(scene, 'sfx.card');
    const { x, y, width } = TUTORIAL_PANEL;
    const left = x + PANEL.pad;
    const ink = PALETTE[WOOD_PANEL.text];
    const blocker = scene.add
      .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.4)
      .setOrigin(0, 0)
      .setDepth(BLOCKER_DEPTH)
      .setInteractive();
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
    const button = new Button(scene, 0, 0, this.t('tutorial.ok'), () => {
      this.close();
      onClose();
    }).setDepth(PANEL_DEPTH + 4);
    button.moveTo(x + (width - button.width) / 2, layout.buttonY + 1);
    const panel = new WoodFrame(
      scene,
      WOOD_PANEL,
      { x, y, width, height: layout.height },
      PANEL_DEPTH,
    );
    panel.zone.setInteractive();
    this.parts.push(blocker, title, body, demo, button, panel);

    // The demo loops for as long as the window is open, repainted only when its frame changes.
    const opened = scene.time.now;
    let shown = -1;
    const paint = (): void => {
      const frame = cardFrameAt(card.loop.frames, scene.time.now - opened);
      if (frame === shown) return;
      shown = frame;
      demo.render(card.loop.pictureAt(frame));
    };
    paint();
    this.timer = scene.time.addEvent({ delay: TICK_MS, loop: true, callback: paint });
  }

  /** Takes the window, its demo and its blocker away, sounding the panel closing if it was open. */
  close(): void {
    if (this.parts.length > 0) playUiSound(this.scene, 'sfx.panelClose');
    this.clear();
  }

  /** Takes the window, its demo and its blocker away, silently. */
  private clear(): void {
    this.timer?.remove();
    this.timer = null;
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
