import type Phaser from 'phaser';
import type { Point } from '../input/target';
import { gearOutline } from '../picture/gear';
import { addFocusable } from './focusables';
import { PALETTE } from './palette';

/** The side of the button's square panel, in canvas pixels. */
export const GEAR_SIZE = 13;

/**
 * Adds the settings button: a gear drawn on a small square panel, like the other greybox buttons, at
 * `at` (its panel's top-left corner). The gear is a polygon (`picture/gear.ts`), so it needs no
 * glyph from the font. The keyboard's focus reaches it like any button.
 */
export function addGearButton(scene: Phaser.Scene, at: Point, onPress: () => void): void {
  const panel = scene.add
    .rectangle(at.x, at.y, GEAR_SIZE, GEAR_SIZE, PALETTE.button)
    .setOrigin(0, 0)
    .setStrokeStyle(1, PALETTE.panelEdge)
    .setDepth(100)
    .setInteractive({ useHandCursor: true })
    .on(
      'pointerdown',
      (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        onPress();
      },
    );
  addFocusable(scene, {
    box: () => ({ x: at.x, y: at.y, width: GEAR_SIZE, height: GEAR_SIZE }),
    depth: () => panel.depth,
    live: () => panel.active && panel.visible,
    press: onPress,
  });
  const centre = { x: at.x + GEAR_SIZE / 2, y: at.y + GEAR_SIZE / 2 };
  scene.add
    .graphics()
    .setDepth(101)
    .fillStyle(PALETTE.label)
    .fillPoints(gearOutline(centre, 8, 5, 3.5), true)
    .fillStyle(PALETTE.button)
    .fillCircle(centre.x, centre.y, 1.5);
}
