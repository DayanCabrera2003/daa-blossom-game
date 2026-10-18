import type Phaser from 'phaser';
import {
  moveFocus,
  reachable,
  refocus,
  type FocusMove,
  type FocusSpot,
  type FocusState,
} from '../../input/focusOrder';
import { keyAction, type KeyAction, type KeyScreen } from '../../input/keyBindings';
import { FOCUS_RING, focusRing } from '../../picture/focusRing';
import { everyFrame } from '../../view/everyFrame';
import { focusablesOf, type Focusable } from '../../view/focusables';
import { PALETTE } from '../../view/palette';

/** Over everything the scene draws: the settings panel's buttons sit at 414. */
const RING_DEPTH = 1000;

/** The moves of the focus, by the action of their key. */
const MOVES: Partial<Record<KeyAction, FocusMove>> = {
  focusNext: 'next',
  focusPrevious: 'previous',
  focusUp: 'up',
  focusDown: 'down',
  focusLeft: 'left',
  focusRight: 'right',
};

/** What the scene tells its focus controller. */
export interface FocusOptions {
  /** Whose keys are read now (the settings panel's, while it is open over the hub or a level). */
  readonly screen: () => KeyScreen;
  /** What Enter and Space do with nothing in focus: move the dialogue on, turn the credits' page. */
  readonly fallback?: () => void;
}

/**
 * The keyboard's focus on a scene of the canvas (plan 09, phase 4). Tab and Shift+Tab, and the
 * arrows, walk what the scene's views put in `view/focusables.ts`, in the order and within the reach
 * `input/focusOrder.ts` decides; Enter and Space press the thing in focus exactly as a touch does
 * (the same function), and the side arrows move a slider in focus. A panel opening above takes the
 * focus; closing it gives the focus back. The ring (`picture/focusRing.ts`) only shows after a key
 * of the focus: a press or a move of the pointer takes it away, so it never gets in the way of the
 * mouse or a finger. Which key does what is the one table's (`input/keyBindings.ts`).
 */
export class FocusController {
  private state: FocusState<Focusable> = { current: null, top: -1, saved: [] };
  private readonly ring: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: FocusOptions,
  ) {
    this.ring = scene.add.graphics().setDepth(RING_DEPTH);
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.key(event));
    scene.input.on('pointerdown', () => this.blur());
    scene.input.on('pointermove', () => this.blur());
    everyFrame(scene, () => this.follow());
  }

  /** The thing in focus while the keyboard is in use, or null. */
  get current(): Focusable | null {
    return this.state.current;
  }

  /** Puts the focus on `item` (a shortcut such as the flowers' F), showing the ring. */
  focusOn(item: Focusable): void {
    this.set(item);
  }

  /** Takes the focus away and hides the ring (the pointer was used, or Escape on the hub). */
  blur(): void {
    if (this.state.current === null) return;
    this.set(null);
  }

  /** A key: a move of the focus, a press, an arrow on a slider; any other key is not the focus's. */
  private key(event: KeyboardEvent): void {
    const action = keyAction(this.options.screen(), {
      key: event.key,
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
    });
    if (action === 'press') {
      // Space must not scroll the page under the canvas.
      event.preventDefault();
      const { current } = this.state;
      if (current !== null) current.press();
      else this.options.fallback?.();
      return;
    }
    const move = action === null ? undefined : MOVES[action];
    if (move === undefined) return;
    // Tab must not take the browser's focus out of the game, nor an arrow scroll the page.
    event.preventDefault();
    const { current } = this.state;
    if (current?.adjust !== undefined && (move === 'left' || move === 'right')) {
      current.adjust(move === 'left' ? -1 : 1);
      return;
    }
    const spots = this.spots();
    const next = moveFocus(spots, current, move);
    this.set(next);
  }

  /** What the keyboard can reach now: what is live, and not under a cover drawn above it. */
  private spots(): FocusSpot<Focusable>[] {
    const { items, covers } = focusablesOf(this.scene);
    const spots = [...items]
      .filter((item) => item.live())
      .map((item) => ({ id: item, box: item.box(), depth: item.depth() }));
    const live = [...covers]
      .filter((cover) => cover.live())
      .map((cover) => ({ box: cover.box(), depth: cover.depth() }));
    return reachable(spots, live);
  }

  /** Every frame: the focus follows the screen (panels opening and closing) and the ring its box. */
  private follow(): void {
    const before = this.state.current;
    this.state = refocus(this.state, this.spots());
    if (this.state.current !== before) {
      before?.focused?.(false);
      this.state.current?.focused?.(true);
    }
    this.paint();
  }

  /** Moves the focus to `item` (null: none), telling both what they need to know. */
  private set(item: Focusable | null): void {
    const before = this.state.current;
    this.state = { ...this.state, current: item, saved: item === null ? [] : this.state.saved };
    if (before !== item) {
      before?.focused?.(false);
      item?.focused?.(true);
    }
    this.paint();
  }

  /** Draws the ring round the thing in focus, or nothing. */
  private paint(): void {
    this.ring.clear();
    const { current } = this.state;
    if (current === null) return;
    this.ring.fillStyle(PALETTE[FOCUS_RING.colour], 1);
    for (const line of focusRing(current.box())) {
      this.ring.fillRect(line.x, line.y, line.width, line.height);
    }
  }
}
