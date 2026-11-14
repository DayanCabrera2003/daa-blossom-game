import type Phaser from 'phaser';
import { NO_PRESSES, pressDown, pressHeld, pressUp } from '../../input/gardenPresses';
import { historyKey, keyAction, pressOf } from '../../input/keyBindings';
import type { Point } from '../../input/target';
import type { CounterexampleEvent } from '../../systems/counterexampleController';
import { heldByPanel } from '../../view/PanelGrip';
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
 * the controller, and the release that ends each of them (let go outside the screen or over a
 * button, it drops the chain); touches on buttons, panels and the dialogue stay theirs. The
 * keyboard's focus walks the buttons and moves the dialogue on; Ctrl/Cmd+Z undoes and Ctrl/Cmd+Y
 * or Ctrl/Cmd+Shift+Z redo; Escape goes back to the question.
 */
export const bindCounterexampleInput = (
  scene: Phaser.Scene,
  target: CounterexampleInputTarget,
): void => {
  const { dispatch } = target;
  const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
  // A press that grabbed a panel's frame is a drag of the panel, never a move in the garden.
  const free = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) =>
    over.length === 0 && !target.dialogueOpen() && !heldByPanel(scene, pointer);
  // The buttons' grown touch zones keep off the garden, whose touches are the player's moves.
  keepGardenClear(scene);
  // Only the release of a press the garden heard reaches it (`input/gardenPresses.ts`): the touch
  // that opened this screen, or that closed its dialogue, never ends here as a tap.
  let presses = NO_PRESSES;
  scene.input.on(
    'pointerdown',
    (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      const down = pressDown(presses, pointer.id, free(pointer, over));
      presses = down.presses;
      if (down.send) dispatch({ kind: 'press', point: at(pointer) });
    },
  );
  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    const held = pointer.isDown && pressHeld(presses, pointer.id);
    if (held && target.drawing()) dispatch({ kind: 'move', point: at(pointer) });
  });
  // Let go on the screen or outside it (a drag that left the canvas): the press held ends either way.
  const release =
    (outside: boolean) =>
    (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[] = []) => {
      const up = pressUp(presses, pointer.id, { free: free(pointer, over), outside });
      presses = up.presses;
      if (up.send !== null) dispatch({ kind: up.send, point: at(pointer) });
    };
  scene.input.on('pointerup', release(false));
  scene.input.on('pointerupoutside', release(true));
  new FocusController(scene, { screen: () => 'counterexample', fallback: target.advanceDialogue });
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    const press = pressOf(event);
    const history = historyKey(press);
    if (history !== null) dispatch({ kind: history });
    else if (keyAction('counterexample', press) === 'escape') target.leave();
  });
};
