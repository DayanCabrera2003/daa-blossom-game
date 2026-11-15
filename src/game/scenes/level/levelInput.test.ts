import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UiEvent } from '../../systems/levelController';
import { bindLevelInput, type LevelInputTarget } from './levelInput';

// The pointer of the level screen: what reaches the garden is a press and the release that ends
// that same press. A touch that closes a panel (its press was the panel's) never ends as a move in
// the garden, and a drag let go outside the screen drops its chain instead of leaving it hanging.

// The views only draw: the input is tested on its own, with a scene that records the listeners.
vi.mock('../../view/PanelGrip', () => ({ heldByPanel: () => false }));
vi.mock('../../view/touchZone', () => ({ keepGardenClear: () => undefined }));
vi.mock('../focus/FocusController', () => ({ FocusController: vi.fn() }));

type Listener = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => void;

/** A scene that only keeps the pointer listeners, to call them as Phaser would. */
function fakeScene(): { scene: Phaser.Scene; fire: (name: string, pointer: object) => void } {
  const listeners = new Map<string, Listener>();
  const input = { on: (name: string, listener: Listener) => listeners.set(name, listener) };
  const fire = (name: string, pointer: object): void =>
    listeners.get(name)?.(pointer as Phaser.Input.Pointer, []);
  return { scene: { input } as unknown as Phaser.Scene, fire };
}

/** A pointer at (x, y), pressed or not. */
const pointer = (id: number, x: number, y: number, isDown = true) => ({
  id,
  worldX: x,
  worldY: y,
  isDown,
});

let sent: UiEvent[];
let dialogueOpen: boolean;
let advanced: number;
let fire: (name: string, pointer: object) => void;

beforeEach(() => {
  sent = [];
  dialogueOpen = false;
  advanced = 0;
  const fake = fakeScene();
  fire = fake.fire;
  const target: LevelInputTarget = {
    dispatch: (event) => sent.push(event),
    leave: () => undefined,
    insideLayer: () => false,
    settingsOpen: () => false,
    closeSettings: () => undefined,
    keysOpen: () => false,
    closeKeys: () => undefined,
    cardOpen: () => false,
    closeCard: () => undefined,
    answerKey: () => undefined,
    dialogueOpen: () => dialogueOpen,
    advanceDialogue: () => {
      advanced += 1;
      dialogueOpen = false;
    },
    drawing: () => true,
  };
  bindLevelInput(fake.scene, target);
});

describe('the pointer of the level screen', () => {
  it('sends a press on the garden and the release that ends it', () => {
    fire('pointerdown', pointer(1, 10, 20));
    fire('pointermove', pointer(1, 15, 20));
    fire('pointerup', pointer(1, 30, 20, false));
    expect(sent).toEqual([
      { kind: 'press', point: { x: 10, y: 20 } },
      { kind: 'move', point: { x: 15, y: 20 } },
      { kind: 'release', point: { x: 30, y: 20 } },
    ]);
  });

  it('keeps the release of the touch that closed the dialogue off the garden', () => {
    dialogueOpen = true;
    fire('pointerdown', pointer(1, 10, 20));
    // The dialogue's last line closes on the press; the release lands on a garden now free.
    dialogueOpen = false;
    fire('pointermove', pointer(1, 12, 20));
    fire('pointerup', pointer(1, 10, 20, false));
    expect(sent).toEqual([]);
  });

  it('moves the dialogue on with a touch anywhere on the garden, which stays untouched', () => {
    dialogueOpen = true;
    fire('pointerdown', pointer(1, 200, 60));
    fire('pointerup', pointer(1, 200, 60, false));
    expect(advanced).toBe(1);
    expect(sent).toEqual([]);
  });

  it('never moves the dialogue on from a touch on the garden while it is closed', () => {
    fire('pointerdown', pointer(1, 200, 60));
    expect(advanced).toBe(0);
  });

  it('pairs each release with the press of the same pointer', () => {
    dialogueOpen = true;
    fire('pointerdown', pointer(1, 10, 20));
    dialogueOpen = false;
    fire('pointerdown', pointer(2, 40, 40));
    fire('pointerup', pointer(1, 10, 20, false));
    fire('pointerup', pointer(2, 40, 40, false));
    expect(sent).toEqual([
      { kind: 'press', point: { x: 40, y: 40 } },
      { kind: 'release', point: { x: 40, y: 40 } },
    ]);
  });

  it('drops the chain of a drag let go outside the screen, without playing it', () => {
    fire('pointerdown', pointer(1, 10, 20));
    fire('pointerupoutside', pointer(1, 500, 20, false));
    expect(sent).toEqual([
      { kind: 'press', point: { x: 10, y: 20 } },
      { kind: 'letGo', point: { x: 500, y: 20 } },
    ]);
  });

  it('ignores a release outside the screen whose press never reached the garden', () => {
    fire('pointerupoutside', pointer(1, 500, 20, false));
    expect(sent).toEqual([]);
  });
});
