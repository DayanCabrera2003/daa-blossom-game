import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { StarResult } from '../systems/stars';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from '../view/Button';
import { PALETTE } from '../view/palette';
import { textStyle } from '../view/textStyle';

/** Shows the panel of a won level: its stars, and where to go next (none after the last level). */
export function showVictoryPanel(
  scene: Phaser.Scene,
  t: Translate,
  stars: StarResult,
  actions: { readonly next: (() => void) | null; readonly hub: () => void },
): void {
  const width = 200;
  const height = 70;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = (CANVAS_HEIGHT - height) / 2;
  scene.add
    .rectangle(x, y, width, height, PALETTE.panel, 0.97)
    .setOrigin(0, 0)
    .setStrokeStyle(1, PALETTE.panelEdge)
    .setDepth(300)
    .setInteractive();
  scene.add
    .text(CANVAS_WIDTH / 2, y + 8, t('victory.title'), textStyle(10, PALETTE.lit))
    .setOrigin(0.5, 0)
    .setDepth(301);
  const shown = `${'★'.repeat(stars.total)}${'☆'.repeat(3 - stars.total)}  ${t('victory.stars', { count: stars.total })}`;
  scene.add
    .text(CANVAS_WIDTH / 2, y + 26, shown, textStyle(8, PALETTE.sun))
    .setOrigin(0.5, 0)
    .setDepth(301);
  new Button(scene, x + 10, y + height - 16, t('victory.hub'), actions.hub).setDepth(302);
  if (actions.next !== null) {
    const next = new Button(scene, 0, y + height - 16, t('victory.next'), actions.next).setDepth(
      302,
    );
    next.moveTo(x + width - 10 - next.width, y + height - 16);
  }
}
