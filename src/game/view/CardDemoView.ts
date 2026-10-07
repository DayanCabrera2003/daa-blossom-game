import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { DEMO_AREA } from '@levels/cards/schema';
import type { Point } from '../input/target';
import type { CardDemoPicture } from '../picture/cardDemo';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** Radius of a sprout in the tiny garden, about half of a real one. */
const MINI_RADIUS = 4;

/** Height of the strip under the tiny garden: the sun's track, the choices, a button pressed. */
export const DEMO_STRIP = 14;

/** Full size of a demo on the card, garden and strip. */
export const DEMO_SIZE = { width: DEMO_AREA.width, height: DEMO_AREA.height + DEMO_STRIP } as const;

/** Size of one choice under the garden: a number in a box, or a written line as a bar. */
const NUMBER_BOX = { width: 11, height: 10 };
const LINE_BAR = { width: 30, height: 6 };

/** Draws a dotted segment, as dark vines are drawn in the real garden. */
function dotted(g: Phaser.GameObjects.Graphics, a: Point, b: Point): void {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  for (let s = 0; s < length; s += 3) {
    const t0 = s / length;
    const t1 = Math.min(length, s + 1.5) / length;
    g.lineBetween(
      a.x + t0 * (b.x - a.x),
      a.y + t0 * (b.y - a.y),
      a.x + t1 * (b.x - a.x),
      a.y + t1 * (b.y - a.y),
    );
  }
}

/**
 * Paints one frame of a mechanic card's demo (GDD §5.11) in a small box at `origin`: the tiny
 * garden in the same greybox language as the real one (dotted dark vines, amber lanterns, cold and
 * warm sprouts, suns and moons, flowers, stones, scarecrows), silver lanterns, white rings where the
 * finger touches, and under it the sun's track, the choices or the button pressed.
 */
export class CardDemoView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly origin: Point,
    private readonly depth: number,
    private readonly t: Translate,
  ) {
    this.graphics = scene.add.graphics().setDepth(depth);
  }

  render(picture: CardDemoPicture): void {
    const g = this.graphics.clear();
    const { x, y } = this.origin;
    // A point of the demo's box, on the canvas.
    const at = (p: Point): Point => ({ x: x + p.x, y: y + p.y });
    g.fillStyle(PALETTE.background).fillRect(x, y, DEMO_SIZE.width, DEMO_SIZE.height);
    g.lineStyle(1, PALETTE.panelEdge).strokeRect(x, y, DEMO_SIZE.width, DEMO_SIZE.height);
    this.paintGarden(g, picture, at);
    for (const touch of picture.touches) {
      const p = at(touch);
      g.lineStyle(1, PALETTE.selected, 0.9).strokeCircle(p.x, p.y, MINI_RADIUS + 3);
      g.fillStyle(PALETTE.selected, 0.6).fillCircle(p.x, p.y, 1.5);
    }
    for (const label of this.labels) label.destroy();
    this.labels.length = 0;
    this.paintStrip(g, picture, { x, y: y + DEMO_AREA.height });
  }

  /** The tiny garden: flowers, vines, silver lanterns, the chain dragged, sprouts and what sits on them. */
  private paintGarden(
    g: Phaser.GameObjects.Graphics,
    picture: CardDemoPicture,
    at: (p: Point) => Point,
  ): void {
    const { garden } = picture;
    for (const flower of garden.flowers) {
      g.lineStyle(1, PALETTE.flower).strokePoints(
        flower.outline.map(at) as Phaser.Types.Math.Vector2Like[],
        true,
      );
    }
    for (const vine of garden.vines) {
      if (!vine.visible) continue;
      const a = at(vine.a);
      const b = at(vine.b);
      if (vine.lit)
        g.lineStyle(2, PALETTE.lit, vine.inFlower ? 0.6 : 1).lineBetween(a.x, a.y, b.x, b.y);
      else {
        g.lineStyle(1, PALETTE.darkVine);
        dotted(g, a, b);
      }
    }
    for (const lantern of picture.silver) {
      const a = at(lantern.a);
      const b = at(lantern.b);
      g.lineStyle(2, PALETTE.mirror, 0.9).lineBetween(a.x, a.y + 2, b.x, b.y + 2);
    }
    if (garden.chain !== null && garden.chain.points.length > 1) {
      const colour =
        garden.chain.gain === null
          ? PALETTE.chainWrong
          : garden.chain.gain === 1
            ? PALETTE.chainGain
            : PALETTE.chainNone;
      g.lineStyle(2, colour, 0.8).strokePoints(
        garden.chain.points.map(at) as Phaser.Types.Math.Vector2Like[],
        false,
      );
    }
    const hidden = garden.fog?.revealed;
    for (const sprout of garden.sprouts) {
      const p = at(sprout);
      if (sprout.stone) {
        g.fillStyle(PALETTE.stone).fillRect(
          p.x - MINI_RADIUS,
          p.y - MINI_RADIUS,
          2 * MINI_RADIUS,
          2 * MINI_RADIUS,
        );
        continue;
      }
      if (sprout.lit) g.fillStyle(PALETTE.litGlow, 0.25).fillCircle(p.x, p.y, MINI_RADIUS + 2);
      const fogged = hidden !== undefined && hidden[sprout.vertex] !== true;
      g.fillStyle(sprout.lit ? PALETTE.lit : PALETTE.dark, fogged ? 0.5 : 1).fillCircle(
        p.x,
        p.y,
        MINI_RADIUS,
      );
      if (sprout.selected) g.lineStyle(1, PALETTE.selected).strokeCircle(p.x, p.y, MINI_RADIUS + 2);
      if (sprout.scarecrow) {
        const r = MINI_RADIUS + 1;
        g.lineStyle(1, PALETTE.scarecrow)
          .lineBetween(p.x - r, p.y - r, p.x + r, p.y + r)
          .lineBetween(p.x - r, p.y + r, p.x + r, p.y - r);
      }
      const badge = p.y - MINI_RADIUS - 4;
      if (sprout.mark === 'sun') g.fillStyle(PALETTE.sun).fillCircle(p.x, badge, 2.5);
      else if (sprout.mark === 'moon') {
        g.fillStyle(PALETTE.moon).fillCircle(p.x, badge, 3);
        g.fillStyle(PALETTE.background).fillCircle(p.x + 1.5, badge - 1, 2.5);
      }
    }
  }

  /** Under the garden: the sun on its track, the choices with the picked one lit, a button pressed. */
  private paintStrip(g: Phaser.GameObjects.Graphics, picture: CardDemoPicture, top: Point): void {
    const middle = top.y + DEMO_STRIP / 2;
    if (picture.sun !== null) {
      const x0 = top.x + 12;
      const x1 = top.x + DEMO_SIZE.width - 12;
      g.lineStyle(1, PALETTE.darkVine).lineBetween(x0, middle, x1, middle);
      g.fillStyle(PALETTE.sun).fillCircle(x0 + picture.sun * (x1 - x0), middle, 4);
    }
    const { choices } = picture;
    if (choices !== null) {
      const size = choices.kind === 'numbers' ? NUMBER_BOX : LINE_BAR;
      const total = choices.count * (size.width + 3) - 3;
      let cx = top.x + (DEMO_SIZE.width - total) / 2;
      for (let option = 0; option < choices.count; option++) {
        const fill = option === choices.picked ? PALETTE.buttonActive : PALETTE.button;
        g.fillStyle(fill).fillRect(cx, middle - size.height / 2, size.width, size.height);
        g.lineStyle(1, PALETTE.panelEdge).strokeRect(
          cx,
          middle - size.height / 2,
          size.width,
          size.height,
        );
        if (choices.kind === 'numbers') this.label(String(option), cx + size.width / 2, middle);
        cx += size.width + 3;
      }
    }
    if (picture.press !== null) {
      const text = this.label(this.t(picture.press), top.x + DEMO_SIZE.width / 2, middle);
      g.fillStyle(PALETTE.buttonActive).fillRect(
        text.x - text.width / 2 - 2,
        middle - 5,
        text.width + 4,
        10,
      );
      g.lineStyle(1, PALETTE.selected).strokeRect(
        text.x - text.width / 2 - 2,
        middle - 5,
        text.width + 4,
        10,
      );
    }
  }

  /** A small text centred at (x, y), above the strip's boxes. */
  private label(text: string, x: number, y: number): Phaser.GameObjects.Text {
    const made = this.scene.add
      .text(x, y, text, textStyle(8))
      .setOrigin(0.5, 0.5)
      .setDepth(this.depth + 1);
    this.labels.push(made);
    return made;
  }

  destroy(): void {
    this.graphics.destroy();
    for (const label of this.labels) label.destroy();
    this.labels.length = 0;
  }
}
