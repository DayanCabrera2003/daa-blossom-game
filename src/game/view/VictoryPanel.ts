import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { StarResult } from '../systems/stars';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { STAR_SIZE } from '../picture/starIcon';
import { Button } from './Button';
import { VICTORY, victoryLayout } from '../picture/victoryLayout';
import { starRows } from '../picture/starRows';
import { WOOD_PANEL } from '../picture/wood';
import { PALETTE } from './palette';
import { drawStars } from './StarIcons';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';
import { coverWith } from './focusables';
import { placeClear } from './panelPlacer';
import { victorySpots } from '../picture/panelSpots';

/**
 * Shows the wooden panel of a won level: a row for each star the level can give, earned or not,
 * saying what it is for (GDD §5.4), and where to go next (none after the last level). The way back
 * is named by the scene: the hub, or the epilogue after the last garden. A garden that earns no
 * stars (`stars` null: the free mode's) says a line of its own in their place.
 * Its texts and buttons are made first and measured, then laid out by `victoryLayout`, so the panel
 * grows round them and no button is ever drawn over another; it sits where it hides least of the
 * garden just won, the middle of the canvas when that hides none (`picture/panelSpots.ts`).
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
    stars === null ? freeLine(scene, t('victory.free'), ink) : starLines(scene, t, stars, ink);
  const buttons = [
    new Button(scene, 0, 0, actions.back.label, actions.back.go).setDepth(302),
    ...(actions.next === null
      ? []
      : [new Button(scene, 0, 0, t('victory.next'), actions.next).setDepth(302)]),
  ];
  const widths = buttons.map((button) => button.width);
  const rows = { width: middle.width, rows: middle.rows };
  // Laid out in the middle of the canvas first, then moved where it hides least of the garden.
  const { x, y, width, height } = victoryLayout(widths, rows);
  const layout = victoryLayout(
    widths,
    rows,
    placeClear(scene, victorySpots({ x, y, width, height })),
  );
  const centre = layout.x + Math.round(layout.width / 2);
  coverWith(
    new WoodFrame(
      scene,
      WOOD_PANEL,
      { x: layout.x, y: layout.y, width: layout.width, height: layout.height },
      300,
    ).zone.setInteractive(),
  );
  title.setPosition(centre, layout.titleY);
  middle.place(centre, layout.rows);
  buttons.forEach((button, i) => {
    const at = layout.buttons[i];
    if (at !== undefined) button.moveTo(at.x, at.y);
  });
}

/**
 * The middle rows made but not yet placed: how many, the width of the widest, and how to put each,
 * centred on the panel's middle, at the top the layout gives it.
 */
interface MiddleRows {
  readonly width: number;
  readonly rows: number;
  readonly place: (centre: number, tops: readonly number[]) => void;
}

/** The free mode's line, centred, in place of the stars. */
function freeLine(scene: Phaser.Scene, said: string, ink: number): MiddleRows {
  const text = scene.add
    .text(CANVAS_WIDTH / 2, 0, said, textStyle(8, ink))
    .setOrigin(0.5, 0)
    .setDepth(301);
  return {
    width: text.width,
    rows: 1,
    place: (centre, [top = 0]) => text.setPosition(centre, top),
  };
}

/**
 * One row per star the level can give: the star, drawn (the pixel font has none) in sunlight when
 * earned and in dim wood when not, then what it is for in words. The rows start at one left edge,
 * so their stars line up, and are centred together.
 */
function starLines(scene: Phaser.Scene, t: Translate, stars: StarResult, ink: number): MiddleRows {
  const rows = starRows(stars).map((row) => ({
    earned: row.earned,
    text: scene.add.text(0, 0, t(`victory.star.${row.star}`), textStyle(8, ink)).setDepth(301),
  }));
  const width = STAR_SIZE + VICTORY.starGap + Math.max(...rows.map((row) => row.text.width));
  return {
    width,
    rows: rows.length,
    place: (centre, tops) => {
      const left = Math.round(centre - width / 2);
      rows.forEach((row, i) => {
        const top = tops[i] ?? 0;
        row.text.setPosition(left + STAR_SIZE + VICTORY.starGap, top);
        const starTop = top + Math.round((row.text.height - STAR_SIZE) / 2);
        drawStars(scene, left, starTop, [{ x: 0, earned: row.earned }], 301);
      });
    },
  };
}
