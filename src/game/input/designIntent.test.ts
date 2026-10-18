import { EMPTY_DESIGN, editDesign, type Design, type DesignEdit } from '@levels/sandbox/design';
import { describe, expect, it } from 'vitest';
import {
  chooseDesignTool,
  designHit,
  designMove,
  designPress,
  designRelease,
  DRAG_THRESHOLD,
  initialDesignPointer,
  type DesignPointer,
  type DesignTool,
} from './designIntent';
import type { Point } from './target';

/** The design an edit gives, failing the test if it is refused. */
function edited(design: Design, ...edits: DesignEdit[]): Design {
  return edits.reduce((now, edit) => {
    const outcome = editDesign(now, edit);
    if (!outcome.ok) throw new Error(`refused: ${outcome.error}`);
    return outcome.value;
  }, design);
}

/** A at (100, 100), B at (160, 100), C at (100, 160); A–B joined and lit. */
const GARDEN = edited(
  EMPTY_DESIGN,
  { type: 'addSprout', x: 100, y: 100 },
  { type: 'addSprout', x: 160, y: 100 },
  { type: 'addSprout', x: 100, y: 160 },
  { type: 'toggleVine', u: 'A', v: 'B' },
  { type: 'toggleLantern', u: 'A', v: 'B' },
);

/** A press and a release at the same point: a touch. */
function tap(
  pointer: DesignPointer,
  design: Design,
  point: Point,
): { pointer: DesignPointer; edit: DesignEdit | null } {
  return designRelease(designPress(pointer, design, point), design, point);
}

/** A press at the first point, moves through the rest, a release at the last. */
function drag(
  pointer: DesignPointer,
  design: Design,
  points: readonly Point[],
): { pointer: DesignPointer; edit: DesignEdit | null } {
  const [first, ...rest] = points as [Point, ...Point[]];
  let now = designPress(pointer, design, first);
  for (const point of rest) now = designMove(now, point);
  return designRelease(now, design, points.at(-1) ?? first);
}

const holding = (tool: DesignTool): DesignPointer => initialDesignPointer(tool);

describe('what a touch lands on in the editor', () => {
  it('a sprout first, within its circle; then a vine, near its line; else the grass', () => {
    expect(designHit(GARDEN, { x: 104, y: 103 })).toEqual({ kind: 'sprout', label: 'A' });
    expect(designHit(GARDEN, { x: 130, y: 102 })).toEqual({ kind: 'vine', u: 'A', v: 'B' });
    expect(designHit(GARDEN, { x: 300, y: 200 })).toEqual({ kind: 'grass' });
  });

  it('two sprouts within reach: the nearer one', () => {
    const close = edited(
      EMPTY_DESIGN,
      { type: 'addSprout', x: 100, y: 100 },
      { type: 'addSprout', x: 118, y: 100 },
    );
    expect(designHit(close, { x: 111, y: 100 })).toEqual({ kind: 'sprout', label: 'B' });
  });
});

describe('the sprout tool', () => {
  it('a touch on the grass plants a sprout where it lands, to the pixel', () => {
    const { edit } = tap(holding('sprout'), GARDEN, { x: 250.4, y: 120.6 });
    expect(edit).toEqual({ type: 'addSprout', x: 250, y: 121 });
  });

  it('a touch on a sprout plants nothing; dragging it moves it', () => {
    expect(tap(holding('sprout'), GARDEN, { x: 100, y: 100 }).edit).toBeNull();
    const { edit } = drag(holding('sprout'), GARDEN, [
      { x: 100, y: 100 },
      { x: 150, y: 140 },
      { x: 200.2, y: 180 },
    ]);
    expect(edit).toEqual({ type: 'moveSprout', label: 'A', x: 200, y: 180 });
  });

  it('a hand that shakes a little still touches: under the threshold it is no drag', () => {
    const { edit } = drag(holding('sprout'), GARDEN, [
      { x: 250, y: 120 },
      { x: 250 + DRAG_THRESHOLD - 1, y: 120 },
    ]);
    expect(edit).toEqual({ type: 'addSprout', x: 250 + DRAG_THRESHOLD - 1, y: 120 });
  });
});

describe('the vine tool', () => {
  it('two touches on sprouts grow a vine between them, and two more take it away', () => {
    const first = tap(holding('vine'), GARDEN, { x: 100, y: 100 });
    expect(first.edit).toBeNull();
    expect(first.pointer.selected).toBe('A');
    const second = tap(first.pointer, GARDEN, { x: 100, y: 160 });
    expect(second.edit).toEqual({ type: 'toggleVine', u: 'A', v: 'C' });
    expect(second.pointer.selected).toBeNull();
    const grown = edited(GARDEN, { type: 'toggleVine', u: 'A', v: 'C' });
    const again = tap(tap(second.pointer, grown, { x: 100, y: 160 }).pointer, grown, {
      x: 100,
      y: 100,
    });
    expect(again.edit).toEqual({ type: 'toggleVine', u: 'C', v: 'A' });
  });

  it('a drag from one sprout to another grows the vine too', () => {
    const { edit } = drag(holding('vine'), GARDEN, [
      { x: 160, y: 100 },
      { x: 130, y: 130 },
      { x: 101, y: 158 },
    ]);
    expect(edit).toEqual({ type: 'toggleVine', u: 'B', v: 'C' });
  });

  it('a touch on the grass does nothing but let go of the sprout chosen', () => {
    const chosen = tap(holding('vine'), GARDEN, { x: 100, y: 100 }).pointer;
    const { pointer, edit } = tap(chosen, GARDEN, { x: 300, y: 200 });
    expect(edit).toBeNull();
    expect(pointer.selected).toBeNull();
    expect(tap(holding('vine'), GARDEN, { x: 300, y: 200 }).edit).toBeNull();
  });

  it('touching the chosen sprout again lets go of it; a drag that ends on the grass does nothing', () => {
    const chosen = tap(holding('vine'), GARDEN, { x: 100, y: 100 }).pointer;
    expect(tap(chosen, GARDEN, { x: 100, y: 100 }).pointer.selected).toBeNull();
    const { edit } = drag(holding('vine'), GARDEN, [
      { x: 100, y: 100 },
      { x: 300, y: 200 },
    ]);
    expect(edit).toBeNull();
  });
});

describe('the lantern, move and remove tools', () => {
  it('a touch on a vine lights it or puts it out; on a sprout or the grass, nothing', () => {
    expect(tap(holding('lantern'), GARDEN, { x: 130, y: 100 }).edit).toEqual({
      type: 'toggleLantern',
      u: 'A',
      v: 'B',
    });
    expect(tap(holding('lantern'), GARDEN, { x: 100, y: 160 }).edit).toBeNull();
    expect(tap(holding('lantern'), GARDEN, { x: 300, y: 200 }).edit).toBeNull();
  });

  it('moving drags a sprout; a touch alone moves nothing', () => {
    expect(tap(holding('move'), GARDEN, { x: 100, y: 100 }).edit).toBeNull();
    const { edit } = drag(holding('move'), GARDEN, [
      { x: 100, y: 160 },
      { x: 300, y: 200 },
    ]);
    expect(edit).toEqual({ type: 'moveSprout', label: 'C', x: 300, y: 200 });
  });

  it('dragging the grass moves nothing', () => {
    const { edit } = drag(holding('move'), GARDEN, [
      { x: 300, y: 200 },
      { x: 350, y: 200 },
    ]);
    expect(edit).toBeNull();
  });

  it('removing takes a sprout touched, or the vine touched', () => {
    expect(tap(holding('remove'), GARDEN, { x: 160, y: 100 }).edit).toEqual({
      type: 'removeSprout',
      label: 'B',
    });
    expect(tap(holding('remove'), GARDEN, { x: 130, y: 100 }).edit).toEqual({
      type: 'toggleVine',
      u: 'A',
      v: 'B',
    });
    expect(tap(holding('remove'), GARDEN, { x: 300, y: 200 }).edit).toBeNull();
  });
});

describe('the pointer between touches', () => {
  it('taking another tool lets go of the sprout chosen', () => {
    const chosen = tap(holding('vine'), GARDEN, { x: 100, y: 100 }).pointer;
    expect(chooseDesignTool(chosen, 'lantern')).toEqual(holding('lantern'));
  });

  it('remembers the press while dragging, and forgets it once released', () => {
    const pressed = designPress(holding('move'), GARDEN, { x: 100, y: 100 });
    const moved = designMove(pressed, { x: 140, y: 130 });
    expect(moved.press).toEqual({
      target: { kind: 'sprout', label: 'A' },
      from: { x: 100, y: 100 },
      at: { x: 140, y: 130 },
      dragging: true,
    });
    expect(designRelease(moved, GARDEN, { x: 140, y: 130 }).pointer.press).toBeNull();
  });

  it('a move or a release with nothing pressed changes nothing', () => {
    const idle = holding('sprout');
    expect(designMove(idle, { x: 1, y: 1 })).toBe(idle);
    expect(designRelease(idle, GARDEN, { x: 300, y: 200 })).toEqual({ pointer: idle, edit: null });
  });
});
