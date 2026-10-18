import type Phaser from 'phaser';
import {
  draggedTo,
  isDoubleTap,
  isDrag,
  isGrip,
  nudged,
  type NudgeDirection,
  type Tap,
} from '../input/panelDrag';
import type { PanelKind } from '../input/panelMemory';
import type { Point } from '../input/target';
import type { Rect } from '../picture/boxDistance';
import { gripMark, gripMarkCentre } from '../picture/gripMark';
import { PALETTE } from './palette';
import { forgetDrop, rememberDrop } from './panelPlacer';

/**
 * A panel the player can drag and drop by its frame (the post-release fix of plan 09), with the
 * pointer or a finger: the view says where its frame is, which parts are its buttons, how to move
 * all of it, and how to place itself again. A press on the frame that moves a few pixels drags the
 * whole panel along, kept on the canvas; on its release the spot is remembered for its kind for the
 * session. A double touch on the frame sends it back to where it places itself. Alt and an arrow
 * move the panel in focus (`nudgePanel`). While a press belongs to a panel the garden ignores it
 * (`heldByPanel`), so a drag is never a move. Every decision is `input/panelDrag.ts`'s.
 */

/** What a view tells about the panel it lets move. */
export interface MovablePanel {
  readonly kind: PanelKind;
  /** The rectangle the panel covers now. */
  readonly frame: () => Rect;
  /** Where a press may grab it; its whole frame when left out. */
  readonly grips?: () => readonly Rect[];
  /** Its buttons, rows and cards, which a press never drags. */
  readonly handles?: () => readonly Rect[];
  /** Moves every part of it so that its frame's top-left corner is at `at`. */
  readonly moveTo: (at: Point) => void;
  /** Places it again where it would open by itself (after the player sent it back). */
  readonly reset: () => void;
  /** Where its grip mark goes; on its top border by default. */
  readonly markAt?: () => Point;
  /** Told while a press holds it (a toast stays in sight while held). */
  readonly held?: (on: boolean) => void;
}

/** A press on a panel: where it grabbed, where the panel was, and whether it drags yet. */
interface Press {
  readonly pointer: number;
  readonly down: number;
  readonly grab: Point;
  readonly origin: Point;
  dragging: boolean;
}

/** Each scene's panels that can move, and the press a panel holds now, if any. */
interface SceneGrips {
  readonly grips: Set<PanelGrip>;
  held: { readonly pointer: number; readonly down: number } | null;
}

const scenes = new WeakMap<Phaser.Scene, SceneGrips>();

/** The moving panels of `scene`, made on first use and dropped when the scene shuts down. */
function gripsOf(scene: Phaser.Scene): SceneGrips {
  let found = scenes.get(scene);
  if (found === undefined) {
    found = { grips: new Set(), held: null };
    scenes.set(scene, found);
    scene.events.once('shutdown', () => scenes.delete(scene));
  }
  return found;
}

/** Whether the press of `pointer` belongs to a panel (grabbed on its frame), not to the garden. */
export function heldByPanel(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
  const { held } = gripsOf(scene);
  return held !== null && held.pointer === pointer.id && held.down === pointer.downTime;
}

/** Whether a panel of one of `kinds` is open on `scene`. */
export const panelOpen = (scene: Phaser.Scene, kinds: readonly PanelKind[]): boolean =>
  [...gripsOf(scene).grips].some((grip) => kinds.includes(grip.kind));

/** Whether `box`'s middle lies on `frame`. */
const holds = (frame: Rect, box: Rect): boolean => {
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  return x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
};

/**
 * Alt and an arrow: moves the panel that holds the thing in focus (`focused`), or else the panel
 * opened last, a few pixels that way. Whether some panel moved.
 */
export function nudgePanel(
  scene: Phaser.Scene,
  direction: NudgeDirection,
  focused: Rect | null,
): boolean {
  const grips = [...gripsOf(scene).grips];
  const target =
    (focused === null ? undefined : grips.find((grip) => holds(grip.frame, focused))) ??
    grips.at(-1);
  target?.nudge(direction);
  return target !== undefined;
}

/** The grip of one panel: its mark, its drag and its double touch. */
export class PanelGrip {
  private readonly mark: Phaser.GameObjects.Graphics;
  private readonly onMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onUp: (pointer: Phaser.Input.Pointer) => void;
  private press: Press | null = null;
  private lastTap: Tap | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly panel: MovablePanel,
    depth: number,
  ) {
    this.mark = scene.add.graphics().setDepth(depth);
    this.paintMark();
    this.onMove = (pointer) => this.move(pointer);
    this.onUp = (pointer) => this.release(pointer);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    gripsOf(scene).grips.add(this);
  }

  /** The kind of the panel. */
  get kind(): PanelKind {
    return this.panel.kind;
  }

  /** The rectangle the panel covers now. */
  get frame(): Rect {
    return this.panel.frame();
  }

  /**
   * A press on the panel (its view's frame took it): grabs the panel when it lands on a grip.
   * Whether it did; when not, the press is the view's (a touch on the dialogue moves it on).
   */
  grab(pointer: Phaser.Input.Pointer): boolean {
    const at = { x: pointer.worldX, y: pointer.worldY };
    const frame = this.panel.frame();
    const grips = this.panel.grips?.() ?? [frame];
    if (!isGrip(at, grips, this.panel.handles?.() ?? [])) return false;
    this.press = {
      pointer: pointer.id,
      down: pointer.downTime,
      grab: at,
      origin: { x: frame.x, y: frame.y },
      dragging: false,
    };
    gripsOf(this.scene).held = { pointer: pointer.id, down: pointer.downTime };
    this.panel.held?.(true);
    return true;
  }

  /** Alt and an arrow: a few pixels that way, remembered as a drop. */
  nudge(direction: NudgeDirection): void {
    const frame = this.panel.frame();
    const at = nudged(frame, direction, frame);
    this.place(at);
    rememberDrop(this.panel.kind, at);
  }

  /** Fades the mark with its panel (a toast fading away). */
  setAlpha(alpha: number): void {
    this.mark.setAlpha(alpha);
  }

  /** Draws the mark again where the panel is now (after its view moved it). */
  paintMark(): void {
    const centre = this.panel.markAt?.() ?? gripMarkCentre(this.panel.frame());
    this.mark.clear().fillStyle(PALETTE.panelEdge, 1);
    for (const dot of gripMark(centre)) this.mark.fillRect(dot.x, dot.y, dot.width, dot.height);
  }

  /** The panel goes: its mark, its listeners, and its place among the panels that can move. */
  destroy(): void {
    this.release(null);
    this.mark.destroy();
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
    gripsOf(this.scene).grips.delete(this);
  }

  /** Moves the panel's corner to `at` and its mark with it. */
  private place(at: Point): void {
    this.panel.moveTo(at);
    this.paintMark();
  }

  /** The pointer moves: once the press has moved far enough, the panel follows it. */
  private move(pointer: Phaser.Input.Pointer): void {
    const { press } = this;
    if (press === null || pointer.id !== press.pointer || !pointer.isDown) return;
    const now = { x: pointer.worldX, y: pointer.worldY };
    if (!press.dragging && !isDrag(press.grab, now)) return;
    press.dragging = true;
    this.place(draggedTo(press.origin, press.grab, now, this.panel.frame()));
  }

  /**
   * The press ends (null: the panel goes while held): a drag drops the panel there for its kind;
   * a touch that makes a double touch with the one before sends it back.
   */
  private release(pointer: Phaser.Input.Pointer | null): void {
    const { press } = this;
    if (press === null || (pointer !== null && pointer.id !== press.pointer)) return;
    this.press = null;
    this.panel.held?.(false);
    if (pointer === null) return;
    if (press.dragging) {
      const { x, y } = this.panel.frame();
      rememberDrop(this.panel.kind, { x, y });
      this.lastTap = null;
      return;
    }
    const tap = { at: press.grab, time: pointer.upTime };
    if (isDoubleTap(this.lastTap, tap)) {
      this.lastTap = null;
      forgetDrop(this.panel.kind);
      this.panel.reset();
      return;
    }
    this.lastTap = tap;
  }
}
