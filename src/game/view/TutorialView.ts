import type Phaser from 'phaser';
import type { CardDemo } from '@levels/cards/demo';
import type { Translate } from '@services/i18n';
import { cardFrameAt } from '../animation/cardLoop';
import { cardDemoPicture } from '../picture/cardDemo';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { CardDemoView, DEMO_SIZE } from './CardDemoView';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** A mechanic card as the window shows it: its texts, already translated, and its demo. */
export interface ShownCard {
  readonly title: string;
  readonly body: string;
  readonly demo: CardDemo;
}

/** The window's width and top, in canvas pixels; it is centred across the canvas. */
const WIDTH = 280;
const TOP = 34;
const PAD = 6;
const GAP = 4;
/** How often the demo checks whether its next frame is due, in milliseconds. */
const TICK_MS = 100;
/** Depths: the blocker over the garden, then the window and what is on it (above questions). */
const BLOCKER_DEPTH = 160;
const PANEL_DEPTH = 260;

/**
 * The window of a mechanic card (GDD §5.11): a title, two or three lines about the gesture, the
 * card's tiny garden doing the gesture by itself in a loop, and "Entendido", which closes it. A dim
 * layer over the garden takes every touch meant for it while the window is open.
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
    this.close();
    const { scene } = this;
    const x = (CANVAS_WIDTH - WIDTH) / 2;
    const blocker = scene.add
      .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.4)
      .setOrigin(0, 0)
      .setDepth(BLOCKER_DEPTH)
      .setInteractive();
    const title = scene.add
      .text(x + PAD, TOP + PAD, card.title, textStyle(10, PALETTE.lit))
      .setDepth(PANEL_DEPTH + 1);
    const body = scene.add
      .text(x + PAD, title.y + title.height + GAP, card.body, {
        ...textStyle(8),
        wordWrap: { width: WIDTH - 2 * PAD },
      })
      .setDepth(PANEL_DEPTH + 1);
    const demoTop = body.y + body.height + GAP + 1;
    const demo = new CardDemoView(
      scene,
      { x: x + (WIDTH - DEMO_SIZE.width) / 2, y: demoTop },
      PANEL_DEPTH + 2,
      this.t,
    );
    const button = new Button(scene, 0, 0, this.t('tutorial.ok'), () => {
      this.close();
      onClose();
    }).setDepth(PANEL_DEPTH + 4);
    const buttonY = demoTop + DEMO_SIZE.height + GAP + 2;
    button.moveTo(x + (WIDTH - button.width) / 2, buttonY);
    const panel = scene.add
      .rectangle(x, TOP, WIDTH, buttonY + button.height + PAD - TOP, PALETTE.panel, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(PANEL_DEPTH)
      .setInteractive();
    this.parts.push(blocker, title, body, demo, button, panel);

    // The demo loops for as long as the window is open, repainted only when its frame changes.
    const opened = scene.time.now;
    let shown = -1;
    const paint = (): void => {
      const frame = cardFrameAt(card.demo.frames.length, scene.time.now - opened);
      if (frame === shown) return;
      shown = frame;
      demo.render(cardDemoPicture(card.demo, frame));
    };
    paint();
    this.timer = scene.time.addEvent({ delay: TICK_MS, loop: true, callback: paint });
  }

  /** Takes the window, its demo and its blocker away. */
  close(): void {
    this.timer?.remove();
    this.timer = null;
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
