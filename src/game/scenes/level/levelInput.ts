import type Phaser from 'phaser';
import { escapeAction } from '../../input/escape';
import { historyKey, keyAction, type KeyPress } from '../../input/keyBindings';
import type { Point } from '../../input/target';
import type { UiEvent } from '../../systems/levelController';
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

/** A key of the browser's event, as the table of keys reads it (Cmd counts as Ctrl). */
const pressOf = (event: KeyboardEvent): KeyPress => ({
  key: event.key,
  ctrl: event.ctrlKey || event.metaKey,
  shift: event.shiftKey,
});

/**
 * Listens to the pointer and the keys of the level screen. Presses and releases on the garden go to
 * the controller; touches on buttons and on the dialogue stay theirs. The keys are the table's
 * (`input/keyBindings.ts`): the keyboard's focus walks the buttons, the tools, the sun and the
 * panels, and Enter or Space press what it is on, or move the dialogue on; a digit answers the
 * question open; Ctrl/Cmd+Z undoes and Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo; Escape closes the
 * card of the keys, or the settings panel, or the mechanic card, or leaves the flower entered with the layers, or else the
 * level (`input/escape.ts`). The garden itself is played with the pointer or a touch only.
 */
export const bindLevelInput = (scene: Phaser.Scene, target: LevelInputTarget): void => {
  const { dispatch } = target;
  const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
  const free = (over: Phaser.GameObjects.GameObject[]) =>
    over.length === 0 && !target.dialogueOpen();
  // The buttons' grown touch zones keep off the garden, whose touches are the player's moves.
  keepGardenClear(scene);
  scene.input.on(
    'pointerdown',
    (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (free(over)) dispatch({ kind: 'press', point: at(pointer) });
    },
  );
  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (pointer.isDown && target.drawing()) dispatch({ kind: 'move', point: at(pointer) });
  });
  scene.input.on(
    'pointerup',
    (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (free(over)) dispatch({ kind: 'release', point: at(pointer) });
    },
  );
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
