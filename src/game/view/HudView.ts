import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import {
  bottomRow,
  HUD_BUTTONS,
  ordersRow,
  traceButtonLeft,
  type HudButton,
} from '../picture/bottomRows';
import type { HudPicture } from '../picture/hud';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import type { AssetKey } from '../assets/keys';
import { BOOK_ICON } from '../picture/buttonIcon';
import { statusEnd, statusLine } from '../picture/statusLine';
import { GEAR_SIZE } from './GearButton';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { OutlinedText } from './OutlinedText';
import { textStyle } from './textStyle';

/** The water drop of the pack, before the water spent. */
const WATER_ICON: AssetKey = 'icon.water';

/** What the HUD buttons do; the level scene decides. */
export interface HudActions {
  readonly done: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly hint: () => void;
  readonly back: () => void;
  /** Opens again the mechanic cards of what the level has open ("?"). */
  readonly help: () => void;
  /** Checks the reflection drawn in the mirror challenge. */
  readonly checkMirror: () => void;
  /** Leaves the innermost flower entered with the layers (5.2). */
  readonly leaveLayer: () => void;
  /** Opens the Códex. */
  readonly book: () => void;
  /** Opens or folds the teacher's trace panel (teacher mode only). */
  readonly trace: () => void;
  /** Moves the light that searches by itself on by one mark (the flower levels). */
  readonly light: () => void;
}

/** How a screen lays its HUD out (`systems/levelScreenOf.ts`). */
export interface HudLayout {
  /** The text key of the back button: "Volver", or "Diseñar" in the free mode. */
  readonly backLabel: string;
  /** The buttons of the bottom row, in `HUD_BUTTONS` order. */
  readonly buttons: readonly HudButton[];
  /** Where the teacher's trace button sits: the end of the tools' row, or beside the Códex. */
  readonly traceRow: 'tools' | 'buttons';
}

/** The HUD of a level of the catalog. */
const LEVEL_HUD: HudLayout = { backLabel: 'hud.back', buttons: HUD_BUTTONS, traceRow: 'tools' };

/**
 * The HUD: the goal (or the question, when it is hidden), lanterns lit and water spent (after the
 * drop of the pack) on top; on wooden buttons, "Terminé", undo, redo, hint, "?" (the mechanic
 * cards again) and back at the bottom right, switched off when not available, "Comprobar" beside them in the mirror challenge, and the way out
 * of a flower entered with the layers, whose depth the status line tells (5.2), and from 7.2 the
 * Council's count on the right of the status line. In teacher mode, the trace button ends the
 * tools' row.
 */
export class HudView {
  private readonly goal: OutlinedText;
  /** The status line: the lanterns lit, the water (after its drop) and the depth of the layers. */
  private readonly status: OutlinedText;
  private readonly water: OutlinedText;
  private readonly layer: OutlinedText;
  /** The drop of the pack before the water spent, when its picture is loaded. */
  private readonly drop: Phaser.GameObjects.Image | null;
  /** What a waiting script step expects (drag the sun, touch a sprout…), centred under the goal. */
  private readonly prompt: OutlinedText;
  /** The Council's count (chapter 7), on the right of the status line. */
  private readonly council: OutlinedText;
  /** The buttons of the bottom row; a screen may leave some out (the free mode, its hint). */
  private readonly buttons: Partial<Record<HudButton, Button>>;
  /** The Códex, at the bottom left after the settings, while some page of it is open. */
  private readonly book: Button;
  /** The teacher's trace panel, at the right end of the tools' row, in teacher mode only. */
  private readonly trace: Button;
  /** "Avanzar la luz", ending the tools' row where the light searches by itself. */
  private readonly light: Button;
  /** Whether the trace sits on the tools' row, where the light's button would push it left. */
  private readonly traceOnTools: boolean;
  /** Whether "Avanzar la luz" is shown now. */
  private lightShown = false;

  constructor(
    scene: Phaser.Scene,
    private readonly t: Translate,
    actions: HudActions,
    layout: HudLayout = LEVEL_HUD,
  ) {
    // Written straight on the season's ground, each line wears the outline of the sprouts' names.
    const line = (x: number, y: number, colour?: number): OutlinedText =>
      new OutlinedText(scene, x, y, '', textStyle(8, colour)).setDepth(100);
    this.goal = line(LAYOUT.margin, LAYOUT.topY);
    this.status = line(LAYOUT.margin, LAYOUT.secondY);
    this.water = line(0, LAYOUT.secondY);
    this.layer = line(0, LAYOUT.secondY);
    this.drop = scene.textures.exists(WATER_ICON)
      ? scene.add
          .image(0, LAYOUT.secondY - 1, WATER_ICON)
          .setOrigin(0, 0)
          .setDepth(100)
      : null;
    this.prompt = line(CANVAS_WIDTH / 2, LAYOUT.secondY, PALETTE.sun).setOrigin(0.5, 0);
    this.council = line(CANVAS_WIDTH - LAYOUT.margin, LAYOUT.secondY).setOrigin(1, 0);
    // Every button keeps its place even while hidden, so the row is laid out for all of them.
    const made = layout.buttons.map(
      (name) =>
        new Button(
          scene,
          0,
          LAYOUT.bottomY,
          t(name === 'back' ? layout.backLabel : `hud.${name}`),
          actions[name],
        ),
    );
    this.book = new Button(scene, 0, LAYOUT.bottomY, t('hud.book'), actions.book, [
      BOOK_ICON,
    ]).setVisible(false);
    this.trace = new Button(scene, 0, LAYOUT.toolbarY, t('hud.trace'), actions.trace).setVisible(
      false,
    );
    this.light = new Button(
      scene,
      0,
      LAYOUT.toolbarY,
      t('hud.stepLight'),
      actions.light,
    ).setVisible(false);
    // In the free mode its orders end the tools' row, so the trace goes beside the Códex.
    const traceBelow = layout.traceRow === 'buttons';
    this.traceOnTools = !traceBelow;
    // The gear, the Códex (and the trace) from the left, the buttons from the right; the row
    // squeezes its gaps if a wider fallback face would make them meet.
    const row = bottomRow({
      gear: GEAR_SIZE,
      book: this.book.width,
      trace: traceBelow ? this.trace.width : null,
      buttons: made.map((button) => button.width),
    });
    made.forEach((button, i) => button.moveTo(itemAt(row.buttons, i), LAYOUT.bottomY));
    this.book.moveTo(row.book, LAYOUT.bottomY);
    if (row.trace === null) {
      this.trace.moveTo(traceButtonLeft(this.trace.width), LAYOUT.toolbarY);
    } else {
      this.trace.moveTo(row.trace, LAYOUT.bottomY);
    }
    this.light.moveTo(traceButtonLeft(this.light.width), LAYOUT.toolbarY);
    this.buttons = Object.fromEntries(layout.buttons.map((name, i) => [name, made[i]]));
  }

  /** Shows the Códex button when some page of the book is open, and hides it otherwise. */
  showBook(open: boolean): void {
    this.book.setVisible(open);
  }

  /**
   * Shows "Avanzar la luz" at the end of the tools' row, the trace (when it shares that row) just
   * before it, or hides it and gives the end of the row back to the trace.
   */
  private showLight(shown: boolean): void {
    if (this.lightShown === shown) return;
    this.lightShown = shown;
    this.light.setVisible(shown);
    if (!this.traceOnTools) return;
    const widths = shown ? [this.trace.width, this.light.width] : [this.trace.width];
    this.trace.moveTo(itemAt(ordersRow(widths), 0), LAYOUT.toolbarY);
  }

  /** Shows the trace button, in teacher mode. */
  showTrace(shown: boolean): void {
    this.trace.setVisible(shown);
  }

  render(hud: HudPicture): void {
    this.goal.setText(this.t(hud.goal.key, hud.goal.params));
    const lanterns = this.t('hud.lanterns', { count: hud.lanterns });
    const water =
      hud.water === null
        ? ''
        : hud.water.budget === null
          ? this.t('hud.waterNoBudget', { used: hud.water.used })
          : this.t('hud.water', { used: hud.water.used, budget: hud.water.budget });
    const inside = hud.layers !== null && hud.layers > 0;
    const layer = inside ? this.t('hud.layer', { depth: hud.layers ?? 0 }) : '';
    this.status.setText(lanterns);
    this.prompt.setText(hud.prompt === null ? '' : this.t(hud.prompt.key, hud.prompt.params));
    this.council.setText(hud.council === null ? '' : this.t(hud.council.key, hud.council.params));
    // The water after its drop, then the layers, apart from what comes before and ending before
    // the prompt and the Council's count (`picture/statusLine.ts`).
    const shortWater =
      hud.water === null
        ? ''
        : hud.water.budget === null
          ? this.t('hud.waterNoBudgetShort', { used: hud.water.used })
          : this.t('hud.waterShort', { used: hud.water.used, budget: hud.water.budget });
    const at = statusLine(
      {
        start: this.status.x,
        lanterns: this.status.width,
        drop: this.drop?.width ?? 0,
        water:
          water === ''
            ? null
            : { full: widthOf(this.water, water), short: widthOf(this.water, shortWater) },
        layer: layer === '' ? null : widthOf(this.layer, layer),
      },
      statusEnd(this.prompt.width, this.council.width),
    );
    this.drop?.setVisible(at.drop !== null);
    if (at.drop !== null) this.drop?.setX(at.drop);
    this.water.setText(at.short ? shortWater : water).setX(at.water ?? 0);
    this.layer.setText(layer).setX(at.layer ?? 0);
    const { undo, redo, hint, done, checkMirror, leaveLayer } = this.buttons;
    undo?.setEnabled(hud.canUndo);
    redo?.setEnabled(hud.canRedo);
    hint?.setEnabled(hud.hintAvailable);
    done?.setVisible(hud.canDeclareDone);
    this.showLight(hud.canStepLight);
    checkMirror?.setVisible(hud.canCheckMirror);
    leaveLayer?.setVisible(inside);
  }
}

/** How wide `line` draws `text`, measured on the line itself. */
const widthOf = (line: OutlinedText, text: string): number => line.setText(text).width;
