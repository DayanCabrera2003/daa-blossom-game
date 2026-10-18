import type Phaser from 'phaser';
import {
  forgetPanel,
  NO_PANELS_MOVED,
  recallPanel,
  rememberPanel,
  type PanelKind,
  type PanelMemory,
} from '../input/panelMemory';
import { clampToCanvas } from '../input/panelDrag';
import type { Point } from '../input/target';
import type { Rect } from '../picture/boxDistance';
import { NOTHING_TO_AVOID, type Avoidance } from '../picture/panelAvoidance';
import { choosePanel } from '../picture/panelPlacement';

/**
 * Where a panel opens (the post-release fix of plan 09): where the player last dropped a panel of
 * its kind in this session, or else the spot that hides least of the garden
 * (`picture/panelPlacement.ts`). A scene with a garden under its panels tells what to keep clear
 * of; a scene that tells nothing keeps its panels where they always opened. The memory of the
 * drops is the session's: it outlives every scene, and is gone when the page closes.
 */

/** Where the player dropped each kind of panel, for the whole session. */
let memory: PanelMemory = NO_PANELS_MOVED;

/** What each scene's panels keep clear of now, by scene. */
const sources = new WeakMap<Phaser.Scene, () => Avoidance>();

/** Tells the panels of `scene` what to keep clear of when they open: asked at each opening. */
export function setPanelAvoidance(scene: Phaser.Scene, avoid: () => Avoidance): void {
  sources.set(scene, avoid);
  scene.events.once('shutdown', () => sources.delete(scene));
}

/**
 * Where a panel of `kind` opens on `scene` among `spots` (where it always opened first): where
 * the player last dropped one, as large as the first spot and kept on the canvas, or the spot
 * that hides least of the garden.
 */
export function placePanel(scene: Phaser.Scene, kind: PanelKind, spots: readonly Rect[]): Rect {
  const dropped = recallPanel(memory, kind);
  const [home] = spots;
  if (dropped !== null && home !== undefined) {
    return { ...home, ...clampToCanvas(dropped, home) };
  }
  return choosePanel(spots, (sources.get(scene) ?? (() => NOTHING_TO_AVOID))());
}

/** The player dropped a panel of `kind` with its corner at `at`: the next ones open there. */
export function rememberDrop(kind: PanelKind, at: Point): void {
  memory = rememberPanel(memory, kind, at);
}

/** The player sent a panel of `kind` back: the next ones place themselves again. */
export function forgetDrop(kind: PanelKind): void {
  memory = forgetPanel(memory, kind);
}
