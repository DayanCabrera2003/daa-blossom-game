import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { SIDE_BY_SIDE } from '@levels/fields';
import type { Point } from '../input/target';
import type { CutPicture, SideBySidePicture } from '../picture/sideBySide';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { SPROUT_RADIUS } from './GardenView';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** Under the garden's vines, so the flower's outline and the cut never hide a sprout. */
const UNDER_DEPTH = 15;
/** The folded garden and the cut over the open one: over the garden, under questions. */
const OVER_DEPTH = 33;

/** Draws a polyline through some points. */
const stroke = (g: Phaser.GameObjects.Graphics, points: readonly Point[]): void => {
  if (points.length >= 2) g.strokePoints(points as Phaser.Types.Math.Vector2Like[], false);
};

/**
 * The flower challenge in greybox (GDD 4.11): the outline of the flower in the open garden, a line
 * down the middle, and in the right half the folded garden (sprouts and the folded flower, vines
 * lit or dark). The last chain drawn shows its moments in turn: its two ends and the base ringed,
 * then the stretch up to the first petal glowing in the open garden, then the same stretch glowing
 * in the folded one, with a caption for each. It paints the picture, nothing more.
 */
export class SideBySideView {
  private readonly under: Phaser.GameObjects.Graphics;
  private readonly over: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly caption: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
  ) {
    this.under = scene.add.graphics().setDepth(UNDER_DEPTH);
    this.over = scene.add.graphics().setDepth(OVER_DEPTH);
    this.caption = scene.add
      .text(CANVAS_WIDTH / 2, LAYOUT.garden.y, '', {
        ...textStyle(8, PALETTE.highlight),
        backgroundColor: '#1d2433cc',
        align: 'center',
        wordWrap: { width: CANVAS_WIDTH - 16 },
      })
      .setOrigin(0.5, 0)
      .setDepth(OVER_DEPTH + 1);
  }

  /** Shows the picture; null hides everything. */
  render(picture: SideBySidePicture | null): void {
    const under = this.under.clear();
    const over = this.over.clear();
    if (picture === null) {
      this.labels.forEach((label) => label.setVisible(false));
      this.caption.setVisible(false);
      return;
    }
    under
      .lineStyle(1, PALETTE.flower, 0.8)
      .strokePoints(picture.outline as Phaser.Types.Math.Vector2Like[], true);
    // The line between the two gardens.
    const { y, height } = LAYOUT.garden;
    over
      .lineStyle(1, PALETTE.darkVine, 0.5)
      .lineBetween(SIDE_BY_SIDE.shift, y, SIDE_BY_SIDE.shift, y + height);
    this.drawFolded(picture);
    this.drawCut(picture.cut, picture);
  }

  private drawFolded(picture: SideBySidePicture): void {
    const g = this.over;
    for (const vine of picture.vines) {
      g.lineStyle(vine.lit ? 2 : 1, vine.lit ? PALETTE.lit : PALETTE.darkVine, 1).lineBetween(
        vine.a.x,
        vine.a.y,
        vine.b.x,
        vine.b.y,
      );
    }
    for (const node of picture.nodes) {
      const radius = node.flower ? SPROUT_RADIUS + 3 : SPROUT_RADIUS;
      g.fillStyle(node.lit ? PALETTE.lit : PALETTE.dark).fillCircle(node.at.x, node.at.y, radius);
      if (node.flower) g.lineStyle(2, PALETTE.flower).strokeCircle(node.at.x, node.at.y, radius);
    }
    while (this.labels.length < picture.nodes.length) {
      this.labels.push(
        this.scene.add.text(0, 0, '', textStyle(8)).setOrigin(0.5, 0).setDepth(OVER_DEPTH),
      );
    }
    this.labels.forEach((label, i) => {
      const node = picture.nodes[i];
      label.setVisible(node !== undefined);
      if (node !== undefined)
        label.setText(node.label).setPosition(node.at.x, node.at.y + SPROUT_RADIUS + 1);
    });
  }

  private drawCut(cut: CutPicture | null, picture: SideBySidePicture): void {
    this.caption.setVisible(cut !== null);
    if (cut === null) return;
    const g = this.over;
    g.lineStyle(2, PALETTE.chainGain, 0.5);
    stroke(g, cut.chain);
    // 1: both ends in the dark, and the base, the only petal in the dark; the outside end stands out.
    g.lineStyle(1, PALETTE.highlight).strokeCircle(cut.other.x, cut.other.y, SPROUT_RADIUS + 3);
    g.lineStyle(2, PALETTE.highlight).strokeCircle(cut.outside.x, cut.outside.y, SPROUT_RADIUS + 4);
    g.lineStyle(1, PALETTE.flower).strokeCircle(cut.base.x, cut.base.y, SPROUT_RADIUS + 3);
    // 2: the stretch up to the first petal glows in the open garden.
    if (cut.moment >= 2) {
      g.lineStyle(4, PALETTE.highlight, 0.8);
      stroke(g, cut.stretch);
    }
    // 3: the same stretch glows in the folded garden, a chain up to the flower.
    if (cut.moment >= 3) {
      g.lineStyle(4, PALETTE.highlight, 0.8);
      stroke(g, cut.folded);
      const flower = picture.nodes.find((node) => node.flower);
      if (flower !== undefined)
        g.lineStyle(2, PALETTE.highlight).strokeCircle(flower.at.x, flower.at.y, SPROUT_RADIUS + 6);
    }
    this.caption.setText(this.t(cut.caption.key, cut.caption.params));
  }
}
