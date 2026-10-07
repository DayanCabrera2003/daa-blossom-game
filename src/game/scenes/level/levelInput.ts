import type Phaser from 'phaser';
import type { Point } from '../../input/target';
import type { UiEvent } from '../../systems/levelController';

/** What the input of the level screen needs to know, and where it sends what it hears. */
export interface LevelInputTarget {
  /** An event of the player for the level controller. */
  readonly dispatch: (event: UiEvent) => void;
  /** Escape: leaves for the hub. */
  readonly leave: () => void;
  /** Whether the dialogue box is open: it takes the touches meant for it. */
  readonly dialogueOpen: () => boolean;
  /** Whether a chain is being drawn: only then does a drag move it on. */
  readonly drawing: () => boolean;
}

/**
 * Listens to the pointer and the keys of the level screen. Presses and releases on the garden go to
 * the controller; touches on buttons and on the dialogue stay theirs. Ctrl/Cmd+Z and Ctrl/Cmd+Y undo
 * and redo, Escape leaves.
 */
export const bindLevelInput = (scene: Phaser.Scene, target: LevelInputTarget): void => {
  const { dispatch } = target;
  const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
  const free = (over: Phaser.GameObjects.GameObject[]) =>
    over.length === 0 && !target.dialogueOpen();
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
  const keys = scene.input.keyboard;
  keys?.on('keydown-Z', (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) dispatch({ kind: 'undo' });
  });
  keys?.on('keydown-Y', (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) dispatch({ kind: 'redo' });
  });
  keys?.on('keydown-ESC', () => target.leave());
};
