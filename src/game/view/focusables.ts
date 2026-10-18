import type Phaser from 'phaser';
import type { Rect } from '../picture/boxDistance';

/**
 * What the keyboard's focus can reach on a scene (plan 09, phase 4): each view that draws something
 * pressable (a button, a slider, a flower, the dialogue box) puts it here, and each dim layer or
 * panel that takes the touches meant for what lies below puts itself here as a cover. The scene's
 * focus controller (`scenes/focus/FocusController.ts`) reads both every frame; the order and the
 * reach are decided by `input/focusOrder.ts`. A thing destroyed or hidden just stops being live, so
 * nothing has to be taken out by hand; the scene's list starts afresh every time the scene starts.
 */

/** A thing the keyboard can focus and press, as a touch would. */
export interface Focusable {
  /** The box it covers on the canvas, now. */
  readonly box: () => Rect;
  /** The depth it is drawn at, now. */
  readonly depth: () => number;
  /** Whether it can take the focus now: shown, switched on and not destroyed. */
  readonly live: () => boolean;
  /** What a touch on it does: Enter and Space do the same. */
  readonly press: () => void;
  /** What the side arrows do while it is in focus (a slider); without it they move the focus. */
  readonly adjust?: (direction: -1 | 1) => void;
  /** Told when the focus comes onto it (true) or leaves it (false): a flower shows its tip. */
  readonly focused?: (on: boolean) => void;
}

/** A layer that takes the touches meant for what lies below it, so the keyboard skips that too. */
export interface FocusCoverSource {
  readonly box: () => Rect;
  readonly depth: () => number;
  readonly live: () => boolean;
}

/** The pressable things and the covers of one scene. */
export interface FocusRegistry {
  readonly items: Set<Focusable>;
  readonly covers: Set<FocusCoverSource>;
}

/** Each scene's registry, made on first use and dropped when the scene shuts down. */
const registries = new WeakMap<Phaser.Scene, FocusRegistry>();

/** The registry of `scene`. */
export function focusablesOf(scene: Phaser.Scene): FocusRegistry {
  let registry = registries.get(scene);
  if (registry === undefined) {
    registry = { items: new Set(), covers: new Set() };
    registries.set(scene, registry);
    // Phaser's shutdown event of the scene: its objects go, and so does their list.
    scene.events.once('shutdown', () => registries.delete(scene));
  }
  return registry;
}

/** Puts `item` among what the keyboard can reach on `scene`. */
export function addFocusable(scene: Phaser.Scene, item: Focusable): void {
  focusablesOf(scene).items.add(item);
}

/** A game object a cover can be read from: its box, its depth and whether it is still there. */
type CoverObject = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.GetBounds &
  Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.Visible;

/**
 * Makes `object` (a dim layer, a panel's wood) a cover on its scene for as long as it is shown;
 * returns it, to chain where it is made.
 */
export function coverWith<T extends CoverObject>(object: T): T {
  focusablesOf(object.scene).covers.add({
    box: () => {
      const { x, y, width, height } = object.getBounds();
      return { x, y, width, height };
    },
    depth: () => object.depth,
    live: () => object.active && object.visible,
  });
  return object;
}
