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

/** Between the row of stars and their count in words. */
const STARS_GAP = 6;

/**
 * Shows the wooden panel of a won level: its stars, and where to go next (none after the last
 * level). The way back is named by the scene: the hub, or the epilogue after the last garden.
 */
export function showVictoryPanel(
  scene: Phaser.Scene,
  t: Translate,
  stars: StarResult,
  actions: {
    readonly next: (() => void) | null;
    readonly back: { readonly label: string; readonly go: () => void };
  },
): void {
  const width = 200;
  const height = 70;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = (CANVAS_HEIGHT - height) / 2;
  new WoodFrame(scene, WOOD_PANEL, { x, y, width, height }, 300).zone.setInteractive();
  const ink = PALETTE[WOOD_PANEL.text];
  scene.add
    .text(CANVAS_WIDTH / 2, y + 8, t('victory.title'), textStyle(10, ink))
    .setOrigin(0.5, 0)
    .setDepth(301);
  // The three stars, drawn (the pixel font has none), then their count in words, centred together.
  const row = starRow(stars.total, MAX_STARS);
  const count = scene.add
    .text(0, y + 26, t('victory.stars', { count: stars.total }), textStyle(8, ink))
    .setDepth(301);
  const starsWidth = rowWidth(MAX_STARS);
  const left = Math.round((CANVAS_WIDTH - starsWidth - STARS_GAP - count.width) / 2);
  count.setX(left + starsWidth + STARS_GAP);
  drawStars(scene, left, y + 26 + Math.round((count.height - STAR_SIZE) / 2), row, 301);
  new Button(scene, x + 10, y + height - 19, actions.back.label, actions.back.go).setDepth(302);
  if (actions.next !== null) {
    const next = new Button(scene, 0, y + height - 19, t('victory.next'), actions.next).setDepth(
      302,
    );
    next.moveTo(x + width - 10 - next.width, y + height - 19);
  }
}
