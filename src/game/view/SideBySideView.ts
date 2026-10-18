import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { SIDE_BY_SIDE } from '@levels/fields';
import type { Point } from '../input/target';
import { FLOWER_HEART, FLOWER_REACH, petalRing } from '../picture/petals';
import type { CutPicture, SideBySidePicture } from '../picture/sideBySide';
import { restingLook } from '../picture/sproutLook';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { everyFrame } from './everyFrame';
import { LanternSprites } from './LanternSprites';
import { LAYOUT } from './layout';
import { paintFlower } from './paintFlower';
import { paintSprout, SPROUT_RADIUS } from './paintSprout';
import { css, PALETTE } from './palette';
import { ensurePieceTextures } from './pieceTextures';
import { SproutCrowns } from './SproutCrowns';
import { OutlinedName } from './OutlinedName';
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
 * The flower challenge (GDD 4.11): the outline of the flower in the open garden, a line down the
 * middle, and in the right half the folded garden in the garden's own pieces (sprouts with their
 * faces and leaves, the folded flower with its petals, vines lit with their lanterns or dark). The
 * last chain drawn shows its moments in turn: its two ends and the base ringed, then the stretch
 * up to the first petal glowing in the open garden, then the same stretch glowing in the folded
 * one, with a caption for each. It paints the picture, nothing more.
 */
export class SideBySideView {
  private readonly under: Phaser.GameObjects.Graphics;
  private readonly over: Phaser.GameObjects.Graphics;
  private readonly bodies: Phaser.GameObjects.Graphics;
  private readonly crowns: SproutCrowns;
  private readonly lanterns: LanternSprites;
  private readonly highlights: Phaser.GameObjects.Graphics;
  /** The folded sprouts' names, outlined as the garden's are, on the ground. */
  private readonly labels: OutlinedName[] = [];
  private readonly caption: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
  ) {
    ensurePieceTextures(scene.textures);
    this.under = scene.add.graphics().setDepth(UNDER_DEPTH);
    this.over = scene.add.graphics().setDepth(OVER_DEPTH);
    // Over the folded garden's vines, in order: lanterns, sprouts, their leaves, the cut's rings.
    this.lanterns = new LanternSprites(scene, 'amber', OVER_DEPTH + 0.1, OVER_DEPTH);
    this.bodies = scene.add.graphics().setDepth(OVER_DEPTH + 0.2);
    this.crowns = new SproutCrowns(scene, OVER_DEPTH + 0.3);
    this.highlights = scene.add.graphics().setDepth(OVER_DEPTH + 0.4);
    everyFrame(scene, (now) => this.lanterns.tick(now));
    this.caption = scene.add
      .text(CANVAS_WIDTH / 2, LAYOUT.garden.y, '', {
        ...textStyle(8, PALETTE.highlight),
        backgroundColor: `${css(PALETTE.background)}cc`,
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
    this.bodies.clear();
    this.highlights.clear();
    if (picture === null) {
      this.labels.forEach((label) => label.setVisible(false));
      this.caption.setVisible(false);
      this.crowns.render([]);
      this.lanterns.clear();
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
    const lit = picture.vines.filter((vine) => vine.lit);
    this.lanterns.render(
      lit.map((vine) => ({ x: (vine.a.x + vine.b.x) / 2, y: (vine.a.y + vine.b.y) / 2 })),
      this.scene.time.now,
    );
    const bodies = this.bodies;
    const crowns = [];
    for (const node of picture.nodes) {
      const { x, y } = node.at;
      if (node.flower) {
        // The folded flower, its heart lit or dark like the sprout it stands for.
        paintFlower(
          bodies,
          node.at,
          petalRing(node.at, picture.petals, FLOWER_REACH, FLOWER_HEART),
          null,
        );
        bodies.fillStyle(node.lit ? PALETTE.lit : PALETTE.dark).fillCircle(x, y, 3);
        continue;
      }
      paintSprout(bodies, {
        x,
        y,
        radius: SPROUT_RADIUS,
        lit: node.lit,
        look: restingLook(node.lit),
      });
      crowns.push({ x, y, radius: SPROUT_RADIUS, species: 'sprout' as const });
    }
    this.crowns.render(crowns);
    while (this.labels.length < picture.nodes.length) {
      this.labels.push(new OutlinedName(this.scene, OVER_DEPTH));
    }
    this.labels.forEach((label, i) => {
      const node = picture.nodes[i];
      label.setVisible(node !== undefined);
      if (node !== undefined) label.show(node.label, node.at.x, node.at.y + SPROUT_RADIUS + 1);
    });
  }

  private drawCut(cut: CutPicture | null, picture: SideBySidePicture): void {
    this.caption.setVisible(cut !== null);
    if (cut === null) return;
    const g = this.highlights;
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
        g.lineStyle(2, PALETTE.highlight).strokeCircle(flower.at.x, flower.at.y, FLOWER_REACH + 2);
    }
    this.caption.setText(this.t(cut.caption.key, cut.caption.params));
  }
}
