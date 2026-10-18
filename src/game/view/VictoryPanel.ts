import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { StarResult } from '../systems/stars';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { rowWidth, STAR_SIZE, starRow } from '../picture/starIcon';
import { Button } from './Button';
import { WOOD_PANEL } from '../picture/wood';
import { PALETTE } from './palette';
import { drawStars } from './StarIcons';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/** The stars a level can give (GDD §5). */
const MAX_STARS = 3;

/** The wooden panel's size, and the air its buttons and lines keep from its sides. */
export const VICTORY_PANEL = { width: 200, height: 70, pad: 10 } as const;

/** Between the row of stars and their count in words. */
const STARS_GAP = 6;

/**
 * Shows the wooden panel of a won level: its stars, and where to go next (none after the last
 * level). The way back is named by the scene: the hub, or the epilogue after the last garden. A
 * garden that earns no stars (`stars` null: the free mode's) says a line of its own in their place.
 */
export function showVictoryPanel(
  scene: Phaser.Scene,
  t: Translate,
  stars: StarResult | null,
  actions: {
    readonly next: (() => void) | null;
    readonly back: { readonly label: string; readonly go: () => void };
  },
): void {
  const { width, height, pad } = VICTORY_PANEL;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = (CANVAS_HEIGHT - height) / 2;
  new WoodFrame(scene, WOOD_PANEL, { x, y, width, height }, 300).zone.setInteractive();
  const ink = PALETTE[WOOD_PANEL.text];
  scene.add
    .text(CANVAS_WIDTH / 2, y + 8, t('victory.title'), textStyle(10, ink))
    .setOrigin(0.5, 0)
    .setDepth(301);
  if (stars === null) {
    scene.add
      .text(CANVAS_WIDTH / 2, y + 26, t('victory.free'), textStyle(8, ink))
      .setOrigin(0.5, 0)
      .setDepth(301);
  } else {
    drawStarRow(scene, t, stars, y + 26, ink);
  }
  new Button(scene, x + pad, y + height - 19, actions.back.label, actions.back.go).setDepth(302);
  if (actions.next !== null) {
    const next = new Button(scene, 0, y + height - 19, t('victory.next'), actions.next).setDepth(
      302,
    );
    next.moveTo(x + width - pad - next.width, y + height - 19);
  }
}

/**
 * The three stars at height `top`, drawn (the pixel font has none), then their count in words,
 * centred together.
 */
function drawStarRow(
  scene: Phaser.Scene,
  t: Translate,
  stars: StarResult,
  top: number,
  ink: number,
): void {
  const row = starRow(stars.total, MAX_STARS);
  const count = scene.add
    .text(0, top, t('victory.stars', { count: stars.total }), textStyle(8, ink))
    .setDepth(301);
  const starsWidth = rowWidth(MAX_STARS);
  const left = Math.round((CANVAS_WIDTH - starsWidth - STARS_GAP - count.width) / 2);
  count.setX(left + starsWidth + STARS_GAP);
  drawStars(scene, left, top + Math.round((count.height - STAR_SIZE) / 2), row, 301);
}
