import type Phaser from 'phaser';
import { hitZone, touchRoom, type Placed } from '../input/hitPadding';
import type { Rect } from '../picture/boxDistance';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { focusablesOf, type Focusable } from './focusables';
import { LAYOUT } from './layout';

/**
 * The buttons' bigger touch zones on the canvas (plan 09, phase 7): a button takes touches a little
 * beyond its wood, into the free space round it (`input/hitPadding.ts` decides how far), with the
 * screen as it is at the moment of the touch: the other pressable things and the panels are the
 * ones the keyboard's focus reads (`view/focusables.ts`), and a scene names the rooms whose touches
 * are another's (the garden) with `keepTouchesClear`.
 */

/** Each scene's rooms kept for other touches, dropped when the scene shuts down. */
const keptRooms = new WeakMap<Phaser.Scene, Rect[]>();

/** Keeps every button's grown zone on `scene` out of `room` (the garden, played by touch). */
export function keepTouchesClear(scene: Phaser.Scene, room: Rect): void {
  let rooms = keptRooms.get(scene);
  if (rooms === undefined) {
    rooms = [];
    keptRooms.set(scene, rooms);
    // Phaser's shutdown event of the scene: a new start lists its rooms afresh.
    scene.events.once('shutdown', () => keptRooms.delete(scene));
  }
  rooms.push(room);
}

/**
 * Keeps the buttons' zones on `scene` off its garden, between the top bar and the toolbar: the
 * sprouts and vines there are pressed and dragged, and a touch a button took would be lost to them.
 */
export function keepGardenClear(scene: Phaser.Scene): void {
  keepTouchesClear(scene, {
    x: 0,
    y: LAYOUT.garden.y,
    width: CANVAS_WIDTH,
    height: LAYOUT.garden.height,
  });
}

/** A thing as the room reads it: its box and its depth now. */
const placed = (item: { box: () => Rect; depth: () => number }): Placed => ({
  box: item.box(),
  depth: item.depth(),
});

/**
 * Makes the interactive `target` (whose top-left corner is the top-left corner of `item`'s box,
 * as a button's wood is) take touches in its grown zone instead of its box. `item` is the button
 * as the keyboard knows it; it is left out of its own neighbours. A target hidden or switched off
 * takes no touch either way: Phaser does not test it, or its press does nothing.
 */
export function growTouchZone(target: Phaser.GameObjects.GameObject, item: Focusable): void {
  const input = target.input;
  if (input === null) return;
  const { scene } = target;
  // Phaser hands the touch in the target's own space, from its top-left corner.
  input.hitAreaCallback = (_area: unknown, x: number, y: number): boolean => {
    const { items, covers } = focusablesOf(scene);
    // Every other thing, shown or not, switched on or off: a zone never grows over a button that
    // is off (a touch there would press its neighbour) nor over the place a hidden one keeps.
    const others = [...items].filter((other) => other !== item).map(placed);
    const live = [...covers].filter((cover) => cover.live()).map(placed);
    const box = item.box();
    const zone = hitZone(box, touchRoom(placed(item), others, live, keptRooms.get(scene) ?? []));
    const at = { x: box.x + x, y: box.y + y };
    return (
      at.x >= zone.x && at.x < zone.x + zone.width && at.y >= zone.y && at.y < zone.y + zone.height
    );
  };
}
