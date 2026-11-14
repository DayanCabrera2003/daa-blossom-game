import type Phaser from 'phaser';
import { historyKey, keyAction, pressOf } from '../../input/keyBindings';
import type { Point } from '../../input/target';
import type { CounterexampleEvent } from '../../systems/counterexampleController';
import { keepGardenClear } from '../../view/touchZone';
import { FocusController } from '../focus/FocusController';

/** What the input of the counterexample screen needs to know, and where it sends what it hears. */
export interface CounterexampleInputTarget {
  /** An event of the player for the counterexample controller. */
  readonly dispatch: (event: CounterexampleEvent) => void;
  /** Escape: back to the question. */
  readonly leave: () => void;
  /** Whether the dialogue box is open: it takes the touches meant for it. */
  readonly dialogueOpen: () => boolean;
  /** Enter or Space with nothing in the keyboard's focus: the dialogue moves on, as a touch does. */
  readonly advanceDialogue: () => void;
  /** Whether a chain is being drawn: only then does a drag move it on. */
  readonly drawing: () => boolean;
}

/**
 * Listens to the pointer and the keys of the counterexample screen. Presses on the garden go to
 * the controller, and the release that ends each of them; touches on buttons and on the dialogue
 * stay theirs. The keyboard's focus walks the buttons and moves the dialogue on; Ctrl/Cmd+Z undoes
 * and Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo; Escape goes back to the question.
 */
export const bindCounterexampleInput = (
  scene: Phaser.Scene,
  target: CounterexampleInputTarget,
): void => {
  const { dispatch } = target;
  const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
  const free = (over: Phaser.GameObjects.GameObject[]) =>
    over.length === 0 && !target.dialogueOpen();
  // The buttons' grown touch zones keep off the garden, whose touches are the player's moves.
  keepGardenClear(scene);
  // Whether a press started on this screen: the touch that opened it must not end here as a tap.
  let pressing = false;
  scene.input.on(
    'pointerdown',
    (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!free(over)) return;
      pressing = true;
      dispatch({ kind: 'press', point: at(pointer) });
    },
  );
  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (pointer.isDown && target.drawing()) dispatch({ kind: 'move', point: at(pointer) });
  });
  scene.input.on(
    'pointerup',
    (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!pressing || !free(over)) return;
      pressing = false;
      dispatch({ kind: 'release', point: at(pointer) });
    },
  );
  new FocusController(scene, { screen: () => 'counterexample', fallback: target.advanceDialogue });
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    const press = pressOf(event);
    const history = historyKey(press);
    if (history !== null) dispatch({ kind: history });
    else if (keyAction('counterexample', press) === 'escape') target.leave();
  });
};
