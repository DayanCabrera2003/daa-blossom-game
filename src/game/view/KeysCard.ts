import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { keysCardLayout, KEYS_CARD } from '../picture/keysCard';
import { playUiSound } from '../audio/uiSound';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { coverWith } from './focusables';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/** Depths: over the settings panel it is opened from (400 to 414). */
const BLOCKER_DEPTH = 420;
const PANEL_DEPTH = 430;
/** The colour the card's text is written in, the one that reads on its wood. */
const INK = PALETTE[KEYS_CARD.frame.text];

/** What the card says, already translated. */
export interface ShownKeys {
  readonly title: string;
  readonly lines: readonly string[];
  readonly close: string;
}

/**
 * The card of the keys (plan 09, phase 4), over the settings panel: its title, a line for each
 * thing the keys do on the screen, and "Cerrar", laid out by `picture/keysCard.ts`, with a dim
 * layer that takes the touches meant for the panel below while it is open. Escape closes it first.
 */
export class KeysCard {
  private parts: { destroy(): void }[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** Whether the card is showing. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /** Opens the card showing `shown`. */
  show(shown: ShownKeys): void {
    this.clear();
    const { scene } = this;
    playUiSound(scene, 'sfx.panelOpen');
    const close = new Button(scene, 0, 0, shown.close, () => this.close()).setDepth(
      PANEL_DEPTH + 2,
    );
    const layout = keysCardLayout(shown.lines.length, close.height);
    const { panel } = layout;
    const blocker = coverWith(
      scene.add
        .rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, PALETTE.fog, 0.3)
        .setOrigin(0, 0)
        .setDepth(BLOCKER_DEPTH)
        .setInteractive(),
    );
    const wood = new WoodFrame(scene, KEYS_CARD.frame, panel, PANEL_DEPTH);
    wood.zone.setInteractive();
    const left = panel.x + KEYS_CARD.pad;
    const title = scene.add
      .text(left, panel.y + layout.title, shown.title, textStyle(10, INK))
      .setDepth(PANEL_DEPTH + 1);
    const lines = shown.lines.map((line, i) =>
      scene.add
        .text(left, panel.y + itemAt(layout.lines, i), line, textStyle(8, INK))
        .setDepth(PANEL_DEPTH + 1),
    );
    close.moveTo(panel.x + Math.round((panel.width - close.width) / 2), panel.y + layout.close);
    this.parts.push(blocker, wood, title, ...lines, close);
  }

  /** Takes the card away, sounding its wood if it was open. */
  close(): void {
    if (this.open) playUiSound(this.scene, 'sfx.panelClose');
    this.clear();
  }

  /** Takes the card away, silently. */
  private clear(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
