import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import { HUD_BUTTONS, hudRow, traceButtonLeft, type HudButton } from '../picture/bottomRows';
import type { HudPicture } from '../picture/hud';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import type { AssetKey } from '../assets/keys';
import { BOOK_ICON, ICON_GAP } from '../picture/buttonIcon';
import { BOTTOM_ROWS } from '../picture/bottomRows';
import { GEAR_SIZE } from './GearButton';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** The water drop of the pack, before the water spent. */
const WATER_ICON: AssetKey = 'icon.water';
/** Between two parts of the status line: three letters of air. */
const STATUS_GAP = 18;

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
}

/**
 * The HUD: the goal (or the question, when it is hidden), lanterns lit and water spent (after the
 * drop of the pack) on top; on wooden buttons, "Terminé", undo, redo, hint, "?" (the mechanic
 * cards again) and back at the bottom right, switched off when not available, "Comprobar" beside them in the mirror challenge, and the way out
 * of a flower entered with the layers, whose depth the status line tells (5.2), and from 7.2 the
 * Council's count on the right of the status line. In teacher mode, the trace button ends the
 * tools' row.
 */
export class HudView {
  private readonly goal: Phaser.GameObjects.Text;
  /** The status line: the lanterns lit, the water (after its drop) and the depth of the layers. */
  private readonly status: Phaser.GameObjects.Text;
  private readonly water: Phaser.GameObjects.Text;
  private readonly layer: Phaser.GameObjects.Text;
  /** The drop of the pack before the water spent, when its picture is loaded. */
  private readonly drop: Phaser.GameObjects.Image | null;
  /** What a waiting script step expects (drag the sun, touch a sprout…), centred under the goal. */
  private readonly prompt: Phaser.GameObjects.Text;
  /** The Council's count (chapter 7), on the right of the status line. */
  private readonly council: Phaser.GameObjects.Text;
  private readonly buttons: Record<HudButton, Button>;
  /** The Códex, at the bottom left after the settings, while some page of it is open. */
  private readonly book: Button;
  /** The teacher's trace panel, at the right end of the tools' row, in teacher mode only. */
  private readonly trace: Button;

  /** `backLabel` is the text key of the back button: "Volver", or "Diseñar" in the free mode. */
  constructor(
    scene: Phaser.Scene,
    private readonly t: Translate,
    actions: HudActions,
    backLabel = 'hud.back',
  ) {
    this.goal = scene.add.text(LAYOUT.margin, LAYOUT.topY, '', textStyle()).setDepth(100);
    this.status = scene.add.text(LAYOUT.margin, LAYOUT.secondY, '', textStyle(8)).setDepth(100);
    this.water = scene.add.text(0, LAYOUT.secondY, '', textStyle(8)).setDepth(100);
    this.layer = scene.add.text(0, LAYOUT.secondY, '', textStyle(8)).setDepth(100);
    this.drop = scene.textures.exists(WATER_ICON)
      ? scene.add
          .image(0, LAYOUT.secondY - 1, WATER_ICON)
          .setOrigin(0, 0)
          .setDepth(100)
      : null;
    this.prompt = scene.add
      .text(CANVAS_WIDTH / 2, LAYOUT.secondY, '', textStyle(8, PALETTE.sun))
      .setOrigin(0.5, 0)
      .setDepth(100);
    this.council = scene.add
      .text(CANVAS_WIDTH - LAYOUT.margin, LAYOUT.secondY, '', textStyle(8))
      .setOrigin(1, 0)
      .setDepth(100);
    // Every button keeps its place even while hidden, so the row is laid out for all of them.
    const made = HUD_BUTTONS.map(
      (name) =>
        new Button(
          scene,
          0,
          LAYOUT.bottomY,
          t(name === 'back' ? backLabel : `hud.${name}`),
          actions[name],
        ),
    );
    const lefts = hudRow(made.map((button) => button.width));
    made.forEach((button, i) => button.moveTo(itemAt(lefts, i), LAYOUT.bottomY));
    // Clear of the buttons laid out from the right: they only reach the left half of the row.
    this.book = new Button(
      scene,
      LAYOUT.margin + GEAR_SIZE + BOTTOM_ROWS.gap,
      LAYOUT.bottomY,
      t('hud.book'),
      actions.book,
      [BOOK_ICON],
    ).setVisible(false);
    this.trace = new Button(scene, 0, LAYOUT.toolbarY, t('hud.trace'), actions.trace).setVisible(
      false,
    );
    this.trace.moveTo(traceButtonLeft(this.trace.width), LAYOUT.toolbarY);
    this.buttons = Object.fromEntries(HUD_BUTTONS.map((name, i) => [name, made[i]])) as Record<
      HudButton,
      Button
    >;
  }

  /** Shows the Códex button when some page of the book is open, and hides it otherwise. */
  showBook(open: boolean): void {
    this.book.setVisible(open);
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
    // The water after its drop, then the layers, each a little apart from what comes before.
    let x = this.status.x + this.status.width;
    this.drop?.setVisible(water !== '');
    if (water !== '') {
      x += STATUS_GAP;
      if (this.drop !== null) {
        this.drop.setX(x);
        x += this.drop.width + ICON_GAP;
      }
    }
    this.water.setText(water).setX(x);
    x += this.water.width;
    this.layer.setText(layer).setX(layer === '' ? x : x + STATUS_GAP);
    this.buttons.undo.setEnabled(hud.canUndo);
    this.buttons.redo.setEnabled(hud.canRedo);
    this.buttons.hint.setEnabled(hud.hintAvailable);
    this.buttons.done.setVisible(hud.canDeclareDone);
    this.buttons.checkMirror.setVisible(hud.canCheckMirror);
    this.buttons.leaveLayer.setVisible(inside);
    this.prompt.setText(hud.prompt === null ? '' : this.t(hud.prompt.key, hud.prompt.params));
    this.council.setText(hud.council === null ? '' : this.t(hud.council.key, hud.council.params));
  }
}
