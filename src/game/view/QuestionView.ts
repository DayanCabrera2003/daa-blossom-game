import type Phaser from 'phaser';
import { playUiSound } from '../audio/uiSound';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { itemAt } from '@core/shared/itemAt';
import { innerWidth, questionLayout } from '../picture/panelLayout';
import { questionSpots } from '../picture/panelSpots';
import { WOOD_PANEL } from '../picture/wood';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';
import { optionForKey } from '../input/optionKeys';
import { coverWith } from './focusables';
import { PanelGrip } from './PanelGrip';
import { placePanel } from './panelPlacer';
import { shiftParts } from './shiftParts';

/** One option as the panel shows it: what choosing it gives, and its text. */
export interface ShownOption {
  readonly value: number;
  readonly label: string;
}

/** What a question panel shows, already translated. */
export interface ShownQuestion {
  readonly prompt: string;
  /** A short instruction under the options ("Toca una respuesta."). */
  readonly footer: string;
  readonly options: readonly ShownOption[];
}

/** Depths: the blocker over the garden, then the panel, its text and its buttons. */
const BLOCKER_DEPTH = 150;
const PANEL_DEPTH = 250;

/**
 * The wooden panel of a question or a bet (plan 03, phase 4; laid out by `picture/panelLayout.ts`,
 * placed clear of the garden and dragged by its frame since the post-release fix of plan 09): the
 * prompt, one button per option, and a
 * dim layer over the garden that takes every touch meant for it, so no lantern moves while the
 * question is open. The top bar and the dialogue box stay usable (a hint, going back). Options
 * flow left to right and wrap, so a row of numbers and a column of written answers both fit. The
 * keyboard's focus reaches each option, and a digit presses the option it names.
 */
export class QuestionView {
  private parts: { destroy(): void }[] = [];
  private buttons = new Map<number, Button>();
  /** The options shown, in their order, for the digits. */
  private options: readonly ShownOption[] = [];
  /** The question open and where its answer goes, to open it again where it places itself. */
  private asked: {
    readonly question: ShownQuestion;
    readonly onAnswer: (value: number) => void;
  } | null = null;
  /** The option a hint points at on the question open, kept when the panel opens again. */
  private marked: number | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Whether a question is on screen. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /**
   * Opens the panel; `onAnswer` gets the value of the option the player touches. A panel opening
   * sounds its wood (plan 06, section 1.8); one already open just shows the new question. It opens
   * where the player last dropped a question, or else where it hides least of the garden: as wide
   * as always, or narrower beside what the question asks about (`view/panelPlacer.ts`).
   */
  show(question: ShownQuestion, onAnswer: (value: number) => void): void {
    const reopening = this.open;
    this.clear();
    this.asked = { question, onAnswer };
    const { scene } = this;
    if (!reopening) playUiSound(scene, 'sfx.panelOpen');
    const blocker = coverWith(
      scene.add
        .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.3)
        .setOrigin(0, 0)
        .setDepth(BLOCKER_DEPTH)
        .setInteractive(),
    );
    const ink = PALETTE[WOOD_PANEL.text];
    const prompt = scene.add
      .text(0, 0, question.prompt, textStyle(8, ink))
      .setDepth(PANEL_DEPTH + 1);
    const footer = scene.add
      .text(0, 0, question.footer, textStyle(8, ink))
      .setDepth(PANEL_DEPTH + 1);
    this.options = question.options;
    const buttons = question.options.map((option) => {
      const button = new Button(scene, 0, 0, option.label, () => onAnswer(option.value));
      this.buttons.set(option.value, button.setDepth(PANEL_DEPTH + 2));
      return button;
    });
    const widths = buttons.map((button) => button.width);
    // The prompt and the footer wrapped at a width, measured: the panel's height there.
    const wrapAt = (width: number): void => {
      prompt.setWordWrapWidth(innerWidth(width));
      footer.setWordWrapWidth(innerWidth(width));
    };
    const heightAt = (width: number): number => {
      wrapAt(width);
      return questionLayout(prompt.height, widths, { x: 0, y: 0, width }, footer.height).height;
    };
    const spot = placePanel(scene, 'question', questionSpots(heightAt, Math.max(...widths)));
    // Laid out once every text is measured at the chosen width: the options flow and wrap.
    wrapAt(spot.width);
    const layout = questionLayout(prompt.height, widths, spot, footer.height);
    prompt.setPosition(layout.prompt.x, layout.prompt.y);
    buttons.forEach((button, i) => {
      const at = itemAt(layout.buttons, i);
      button.moveTo(at.x, at.y + 1);
    });
    footer.setPosition(layout.footer.x, layout.footer.y);
    const panel = new WoodFrame(
      scene,
      WOOD_PANEL,
      { x: spot.x, y: spot.y, width: spot.width, height: layout.height },
      PANEL_DEPTH,
    );
    const moving = [prompt, footer, ...buttons, panel];
    const grip = new PanelGrip(
      scene,
      {
        kind: 'question',
        frame: () => panel.bounds,
        handles: () => buttons.map((button) => button.bounds),
        moveTo: (at) => shiftParts(moving, at.x - panel.bounds.x, at.y - panel.bounds.y),
        reset: () => this.reopen(),
      },
      PANEL_DEPTH + 1,
    );
    panel.zone
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => grip.grab(pointer));
    this.parts.push(blocker, ...moving, grip);
    if (this.marked !== null) this.mark(this.marked);
  }

  /**
   * A digit on the open question: presses the option it names (`input/optionKeys.ts`), as a touch
   * would. Whether it pressed one.
   */
  pressKey(key: string): boolean {
    const index = optionForKey(
      key,
      this.options.map((option) => option.label),
    );
    if (index === null) return false;
    this.buttons.get(itemAt(this.options, index).value)?.press();
    return true;
  }

  /** Marks an option as the one the mentor points at (a grade-3 hint). */
  mark(value: number): void {
    this.marked = value;
    this.buttons.get(value)?.setActive(true);
  }

  /** Opens the same question again, silently, where it places itself (the player sent it back). */
  private reopen(): void {
    const { asked } = this;
    if (asked !== null) this.show(asked.question, asked.onAnswer);
  }

  /** Takes the panel and its blocker away, sounding its wood if it was open. */
  close(): void {
    if (this.open) playUiSound(this.scene, 'sfx.panelClose');
    this.clear();
    this.asked = null;
    this.marked = null;
  }

  /** Takes the panel and its blocker away, silently. */
  private clear(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    this.buttons.clear();
    this.options = [];
  }
}
