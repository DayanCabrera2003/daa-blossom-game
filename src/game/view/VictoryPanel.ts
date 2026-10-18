import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { StarResult } from '../systems/stars';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { rowWidth, STAR_SIZE, starRow } from '../picture/starIcon';
import { Button } from './Button';
import { victoryLayout } from '../picture/victoryLayout';
import { WOOD_PANEL } from '../picture/wood';
import { PALETTE } from './palette';
import { drawStars } from './StarIcons';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';
import { coverWith } from './focusables';

/** The stars a level can give (GDD §5). */
const MAX_STARS = 3;

/** Between the row of stars and their count in words. */
const STARS_GAP = 6;

/**
 * Shows the wooden panel of a won level: its stars, and where to go next (none after the last
 * level). The way back is named by the scene: the hub, or the epilogue after the last garden. A
 * garden that earns no stars (`stars` null: the free mode's) says a line of its own in their place.
 * Its texts and buttons are made first and measured, then laid out by `victoryLayout`, so the panel
 * grows round them and no button is ever drawn over another.
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
  const ink = PALETTE[WOOD_PANEL.text];
  const title = scene.add
    .text(CANVAS_WIDTH / 2, 0, t('victory.title'), textStyle(10, ink))
    .setOrigin(0.5, 0)
    .setDepth(301);
  const middle =
    stars === null
      ? freeLine(scene, t('victory.free'), ink)
      : starLine(scene, t('victory.stars', { count: stars.total }), stars, ink);
  const buttons = [
    new Button(scene, 0, 0, actions.back.label, actions.back.go).setDepth(302),
    ...(actions.next === null
      ? []
      : [new Button(scene, 0, 0, t('victory.next'), actions.next).setDepth(302)]),
  ];
  const layout = victoryLayout(
    buttons.map((button) => button.width),
    middle.width,
  );
  coverWith(
    new WoodFrame(
      scene,
      WOOD_PANEL,
      { x: layout.x, y: layout.y, width: layout.width, height: layout.height },
      300,
    ).zone.setInteractive(),
  );
  title.setY(layout.titleY);
  middle.place(layout.lineY);
  buttons.forEach((button, i) => {
    const at = layout.buttons[i];
    if (at !== undefined) button.moveTo(at.x, at.y);
  });
}

/** A middle line made but not yet placed: its width, and how to put it at a height. */
interface MiddleLine {
  readonly width: number;
  readonly place: (top: number) => void;
}

/** The free mode's line, centred, in place of the stars. */
function freeLine(scene: Phaser.Scene, said: string, ink: number): MiddleLine {
  const text = scene.add
    .text(CANVAS_WIDTH / 2, 0, said, textStyle(8, ink))
    .setOrigin(0.5, 0)
    .setDepth(301);
  return { width: text.width, place: (top) => text.setY(top) };
}

/**
 * The three stars, drawn (the pixel font has none), then their count in words, centred together.
 */
function starLine(scene: Phaser.Scene, said: string, stars: StarResult, ink: number): MiddleLine {
  const count = scene.add.text(0, 0, said, textStyle(8, ink)).setDepth(301);
  const starsWidth = rowWidth(MAX_STARS);
  const width = starsWidth + STARS_GAP + count.width;
  return {
    width,
    place: (top) => {
      const left = Math.round((CANVAS_WIDTH - width) / 2);
      count.setPosition(left + starsWidth + STARS_GAP, top);
      drawStars(
        scene,
        left,
        top + Math.round((count.height - STAR_SIZE) / 2),
        starRow(stars.total, MAX_STARS),
        301,
      );
    },
  };
}
