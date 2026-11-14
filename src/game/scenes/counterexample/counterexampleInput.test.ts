import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CounterexampleEvent } from '../../systems/counterexampleController';
import { bindCounterexampleInput } from './counterexampleInput';

// The pointer of the counterexample screen: what reaches the garden is a press and the release
// that ends that same press. A touch that closes the dialogue never ends as a move in the garden.

// The views only draw: the input is tested on its own, with a scene that records the listeners.
vi.mock('../../view/touchZone', () => ({ keepGardenClear: () => undefined }));
vi.mock('../focus/FocusController', () => ({ FocusController: vi.fn() }));

type Listener = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => void;
type KeyListener = (event: KeyboardEvent) => void;

/** A scene that only keeps the pointer and key listeners, to call them as Phaser would. */
function fakeScene() {
  const listeners = new Map<string, Listener>();
  let keyListener: KeyListener = () => undefined;
  const input = {
    on: (name: string, listener: Listener) => listeners.set(name, listener),
    keyboard: { on: (_name: string, listener: KeyListener) => (keyListener = listener) },
  };
  /** Fires `name` for `pointer`; `over` says whether something (a button, a panel) lies under it. */
  const fire = (name: string, pointer: object, over = false): void =>
    listeners.get(name)?.(
      pointer as Phaser.Input.Pointer,
      over ? [{} as Phaser.GameObjects.GameObject] : [],
    );
  const key = (event: Partial<KeyboardEvent>): void => keyListener(event as KeyboardEvent);
  return { scene: { input } as unknown as Phaser.Scene, fire, key };
}

/** A pointer at (x, y), pressed or not. */
const pointer = (id: number, x: number, y: number, isDown = true) => ({
  id,
  worldX: x,
  worldY: y,
  isDown,
});

let sent: CounterexampleEvent[];
let dialogueOpen: boolean;
let left: number;
let fake: ReturnType<typeof fakeScene>;

beforeEach(() => {
  sent = [];
  dialogueOpen = false;
  left = 0;
  fake = fakeScene();
  bindCounterexampleInput(fake.scene, {
    dispatch: (event) => sent.push(event),
    leave: () => (left += 1),
    dialogueOpen: () => dialogueOpen,
    advanceDialogue: () => {
      dialogueOpen = false;
    },
    drawing: () => true,
  });
});

describe('the pointer of the counterexample screen', () => {
  it('sends a press on the garden and the release that ends it', () => {
    fake.fire('pointerdown', pointer(1, 10, 20));
    fake.fire('pointermove', pointer(1, 15, 20));
    fake.fire('pointerup', pointer(1, 30, 20, false));
    expect(sent).toEqual([
      { kind: 'press', point: { x: 10, y: 20 } },
      { kind: 'move', point: { x: 15, y: 20 } },
      { kind: 'release', point: { x: 30, y: 20 } },
    ]);
  });

  it('keeps the release of the touch that closed the dialogue off the garden', () => {
    dialogueOpen = true;
    fake.fire('pointerdown', pointer(1, 10, 20));
    // The dialogue's last line closes on the press; the release lands on a garden now free.
    dialogueOpen = false;
    fake.fire('pointerup', pointer(1, 10, 20, false));
    expect(sent).toEqual([]);
  });

  it('keeps touches on a button off the garden', () => {
    fake.fire('pointerdown', pointer(1, 10, 20), true);
    fake.fire('pointerup', pointer(1, 10, 20, false), true);
    expect(sent).toEqual([]);
  });
});

describe('the keys of the counterexample screen', () => {
  it('undo with Ctrl+Z, and Escape goes back to the question', () => {
    fake.key({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false });
    expect(sent).toEqual([{ kind: 'undo' }]);
    fake.key({ key: 'Escape', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
    expect(left).toBe(1);
  });
});
