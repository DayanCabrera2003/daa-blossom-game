import type Phaser from 'phaser';
import { escapeAction } from '../../input/escape';
import { NO_PRESSES, pressDown, pressHeld, pressUp } from '../../input/gardenPresses';
import { historyKey, keyAction, pressOf } from '../../input/keyBindings';
import type { Point } from '../../input/target';
import type { UiEvent } from '../../systems/levelController';
import { heldByPanel } from '../../view/PanelGrip';
import { keepGardenClear } from '../../view/touchZone';
import { FocusController } from '../focus/FocusController';

/** What the input of the level screen needs to know, and where it sends what it hears. */
export interface LevelInputTarget {
  /** An event of the player for the level controller. */
  readonly dispatch: (event: UiEvent) => void;
  /** Escape: leaves for the hub. */
  readonly leave: () => void;
  /** Whether a flower is entered with the layers: then Escape leaves it instead (5.2). */
  readonly insideLayer: () => boolean;
  /** Whether the settings panel is open: then Escape closes it instead. */
  readonly settingsOpen: () => boolean;
  /** Closes the settings panel. */
  readonly closeSettings: () => void;
  /** Whether the card of the keys is open over the settings panel: Escape closes it first. */
  readonly keysOpen: () => boolean;
  /** Closes the card of the keys. */
  readonly closeKeys: () => void;
  /** Whether a mechanic card is open: then Escape dismisses it, as its button does. */
  readonly cardOpen: () => boolean;
  /** Dismisses the mechanic card open. */
  readonly closeCard: () => void;
  /** A digit: answers the question open with the option it names, if any. */
  readonly answerKey: (key: string) => void;
  /** Whether the dialogue box is open: it takes the touches meant for it. */
  readonly dialogueOpen: () => boolean;
  /** Enter or Space with nothing in the keyboard's focus: the dialogue moves on, as a touch does. */
  readonly advanceDialogue: () => void;
  /** Whether a chain is being drawn: only then does a drag move it on. */
  readonly drawing: () => boolean;
}

/**
 * Listens to the pointer and the keys of the level screen. Presses on the garden go to the
 * controller, and the release that ends each of them (let go outside the screen, it drops the
 * chain); touches on buttons and on the dialogue stay theirs. The keys are the table's
 * (`input/keyBindings.ts`): the keyboard's focus walks the buttons, the tools, the sun and the
 * panels, and Enter or Space press what it is on, or move the dialogue on; a digit answers the
 * question open; Ctrl/Cmd+Z undoes and Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo; Escape closes the
 * card of the keys, or the settings panel, or the mechanic card, or leaves the flower entered with the layers, or else the
 * level (`input/escape.ts`). The garden itself is played with the pointer or a touch only.
 */
export const bindLevelInput = (scene: Phaser.Scene, target: LevelInputTarget): void => {
  const { dispatch } = target;
  const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
  // A press that grabbed a panel's frame is a drag of the panel, never a move in the garden.
  const free = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) =>
    over.length === 0 && !target.dialogueOpen() && !heldByPanel(scene, pointer);
  // The buttons' grown touch zones keep off the garden, whose touches are the player's moves.
  keepGardenClear(scene);
  // Only the release of a press the garden heard reaches it (`input/gardenPresses.ts`).
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
  const screen = () => (target.settingsOpen() ? 'settings' : 'level');
  new FocusController(scene, { screen, fallback: target.advanceDialogue });
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    const press = pressOf(event);
    const history = historyKey(press);
    if (history !== null) {
      dispatch({ kind: history });
      return;
    }
    const action = keyAction(screen(), press);
    if (action === 'answer') target.answerKey(event.key);
    if (action === 'escape') escape(target);
  });
};

/** Escape: the innermost thing open closes, or else the level is left. */
function escape(target: LevelInputTarget): void {
  const action = escapeAction({
    keysOpen: target.keysOpen(),
    settingsOpen: target.settingsOpen(),
    cardOpen: target.cardOpen(),
    insideLayer: target.insideLayer(),
    canLeave: true,
  });
  if (action === 'closeKeys') target.closeKeys();
  else if (action === 'closeSettings') target.closeSettings();
  else if (action === 'closeCard') target.closeCard();
  else if (action === 'leaveLayer') target.dispatch({ kind: 'leaveLayer' });
  else target.leave();
}
