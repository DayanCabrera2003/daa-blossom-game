import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { ICON_GAP, RACE_ICON } from '../picture/buttonIcon';
import type { CostChart } from '../picture/costChart';
import type { CounterPicture } from '../picture/raceClock';
import { raceCounterText } from '../picture/raceCounterText';
import type { RaceLayout, RacePanelPicture } from '../picture/racePanel';
import { fontMetrics } from '../picture/pixelFont';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { coverWith } from './focusables';

/** Space around the panel's contents, in canvas pixels. */
const PAD = 6;
/** The panel's top, under the top bar, and its height, down to the toolbar. */
const TOP = LAYOUT.garden.y + 1;
const HEIGHT = LAYOUT.garden.height - 2;
/** Where the chart's box starts on the canvas: in the lower right, clear of a question's panel. */
const CHART_AT = { x: 236, y: 118 } as const;

/**
 * Where the panel draws the zoomed-out garden (on the left, under the title) and the chart (in
 * the lower right, so a doubling bet asked over the panel leaves it in view).
 */
export const RACE_LAYOUT: RaceLayout = {
  miniature: { x: PAD + 4, y: TOP + 18, width: 118, height: 118 },
  chart: { width: CANVAS_WIDTH - CHART_AT.x - 2 * PAD - 4, height: 96 },
};

/**
 * Depths: over the garden and under the toasts (150), the question's dim layer (150) and the
 * dialogue box (200), so the lines and bets of a race are read over it.
 */
const PANEL_DEPTH = 110;

/**
 * Where each runner's counter is written, under the miniature: from the panel's padding to just
 * short of the chart, wrapping in up to two rows, so a long count never runs into the chart.
 */
export const RACE_COUNTERS = { x: PAD + 4, width: CHART_AT.x - PAD - 8, rows: 2 } as const;

/** The colours of the two runners, on the chart and in their counters. */
const AUTOMATON = PALETTE.lit;
const BRUTO = PALETTE.moon;

/** Room before a legend's name for the dot of its colour. */
const LEGEND_DOT_ROOM = 7;

/**
 * The races (GDD 6.4, 6.5, plan 05 phase 4): over the garden, under the hourglass of the pack and
 * the race's title, the garden of the race zoomed out with its sprouts tiny on a ring, a counter
 * for each runner under it, and in the lower right the chart of the races seen so far, the
 * automaton's dots joined in a gentle curve and Bruto's leaving through the top, or asleep. The
 * counters run every frame; the rest is rebuilt only when the picture's race or chart changes. It
 * paints the picture, nothing more.
 */
export class RaceView {
  private parts: { destroy(): void }[] = [];
  /** The race and chart painted now, as a key, so an unchanged one is not built again. */
  private shown = 'null';
  private counters: { automaton: Phaser.GameObjects.Text; bruto: Phaser.GameObjects.Text } | null =
    null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
  ) {}

  /** Paints the panel; null closes it. */
  render(picture: RacePanelPicture | null): void {
    const key =
      picture === null ? 'null' : JSON.stringify([picture.step, picture.size, picture.chart]);
    if (key !== this.shown) {
      this.shown = key;
      this.close();
      if (picture !== null) this.build(picture);
    }
    if (picture !== null && this.counters !== null) {
      this.counters.automaton.setText(this.counterText('automaton', picture.automaton));
      this.counters.bruto.setText(this.counterText('bruto', picture.bruto));
    }
  }

  /** Builds the panel: its background, the title, the miniature, the counters and the chart. */
  private build(picture: RacePanelPicture): void {
    const panel = coverWith(
      this.scene.add
        .rectangle(PAD - 2, TOP, CANVAS_WIDTH - 2 * (PAD - 2), HEIGHT, PALETTE.panel, 0.97)
        .setOrigin(0, 0)
        .setStrokeStyle(1, PALETTE.panelEdge)
        .setDepth(PANEL_DEPTH)
        .setInteractive(),
    );
    this.parts.push(panel);
    // The hourglass of the races, then the title after it.
    let titleX = PAD + 4;
    if (this.scene.textures.exists(RACE_ICON.texture)) {
      const icon = this.scene.add
        .image(titleX, TOP + 1, RACE_ICON.texture)
        .setOrigin(0, 0)
        .setScale(RACE_ICON.scale)
        .setDepth(PANEL_DEPTH + 2);
      this.parts.push(icon);
      titleX += icon.displayWidth + ICON_GAP;
    }
    this.text(titleX, TOP + 4, this.t('race.title', { count: picture.size }), PALETTE.label);
    this.drawMiniature(picture);
    const { miniature } = RACE_LAYOUT;
    const below = miniature.y + miniature.height + 4;
    const rows = RACE_COUNTERS.rows * fontMetrics(8).fontSize;
    this.counters = {
      automaton: this.counter(below, AUTOMATON),
      bruto: this.counter(below + rows, BRUTO),
    };
    this.drawChart(picture.chart);
  }

  /**
   * The garden of the race seen from far away: thin vines, and tiny sprouts in the garden's own
   * look, cold blue bodies with the near-black outline of the pieces and a glint of light.
   */
  private drawMiniature(picture: RacePanelPicture): void {
    const g = this.scene.add.graphics().setDepth(PANEL_DEPTH + 1);
    this.parts.push(g);
    g.lineStyle(1, PALETTE.darkVine, 0.35);
    for (const [a, b] of picture.miniature.vines) g.lineBetween(a.x, a.y, b.x, b.y);
    for (const { x, y } of picture.miniature.sprouts) {
      g.fillStyle(PALETTE.background, 1).fillCircle(x, y, 2.5);
      g.fillStyle(PALETTE.dark, 1).fillCircle(x, y, 1.5);
      g.fillStyle(PALETTE.moon, 0.8).fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1);
    }
  }

  /** The chart: its axes and labels, the sizes along the bottom, and the dots seen so far. */
  private drawChart(chart: CostChart): void {
    const { width, height } = RACE_LAYOUT.chart;
    const { x: x0, y: y0 } = CHART_AT;
    const g = this.scene.add.graphics().setDepth(PANEL_DEPTH + 1);
    this.parts.push(g);
    g.lineStyle(1, PALETTE.label, 0.7)
      .lineBetween(x0, y0, x0, y0 + height)
      .lineBetween(x0, y0 + height, x0 + width, y0 + height);
    // Each runner's name after a dot of its curve's colour, drawn: the pixel font has no ●.
    const legend = [
      [x0 - 2, 'race.legend.automaton', AUTOMATON],
      [x0 + width / 2, 'race.legend.bruto', BRUTO],
    ] as const;
    for (const [x, key, colour] of legend) {
      const label = this.text(x + LEGEND_DOT_ROOM, y0 - 22, this.t(key), colour);
      g.fillStyle(colour, 1).fillCircle(x + 2, y0 - 22 + label.height / 2, 2);
    }
    this.text(x0 + 3, y0 - 11, this.t('race.axis.steps'), PALETTE.darkVine);
    this.text(x0 + width - 30, y0 + height + 10, this.t('race.axis.sprouts'), PALETTE.darkVine);
    for (const { n, x } of chart.sizes) {
      this.text(x0 + x - 4, y0 + height + 2, String(n), PALETTE.darkVine);
    }
    const at = (dot: { x: number; y: number }) => ({ x: x0 + dot.x, y: y0 + dot.y });
    // The automaton's curve, dot by dot.
    const curve = chart.automaton.map(at);
    g.lineStyle(1, AUTOMATON, 1);
    if (curve.length >= 2) g.strokePoints(curve, false);
    g.fillStyle(AUTOMATON, 1);
    for (const { x, y } of curve) g.fillCircle(x, y, 2);
    // Bruto's: his dots that fit, and at the top edge an arrow out of the chart or "asleep".
    const fits = chart.bruto.filter((dot) => dot.mark === 'shown').map(at);
    g.lineStyle(1, BRUTO, 1);
    if (fits.length >= 2) g.strokePoints(fits, false);
    g.fillStyle(BRUTO, 1);
    for (const { x, y } of fits) g.fillCircle(x, y, 2);
    for (const dot of chart.bruto) {
      const { x, y } = at(dot);
      if (dot.mark === 'above') g.fillTriangle(x - 3, y + 3, x + 3, y + 3, x, y - 2);
      if (dot.mark === 'asleep') this.text(x - 6, y - 10, this.t('race.asleep'), BRUTO);
    }
  }

  /** What a counter says: the steps so far, and once over, the finish or the sleep. */
  private counterText(runner: 'automaton' | 'bruto', counter: CounterPicture): string {
    const { key, params } = raceCounterText(runner, counter);
    return this.t(key, params);
  }

  /** A runner's counter, wrapping before the chart. */
  private counter(y: number, colour: number): Phaser.GameObjects.Text {
    return this.text(RACE_COUNTERS.x, y, '', colour).setWordWrapWidth(RACE_COUNTERS.width);
  }

  /** A line of text on the panel. */
  private text(x: number, y: number, text: string, colour: number): Phaser.GameObjects.Text {
    const shown = this.scene.add.text(x, y, text, textStyle(8, colour)).setDepth(PANEL_DEPTH + 2);
    this.parts.push(shown);
    return shown;
  }

  /** Takes the panel away. */
  private close(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    this.counters = null;
  }
}
