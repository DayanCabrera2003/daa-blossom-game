import { pathGraph } from '@core/generators/families';
import { createMatching } from '@core/matching/createMatching';
import { createGardenState } from '@core/rules/state';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { chooseTool, initialPointer, pressEnd, pressMove, pressStart } from './pointer';
import { NO_SELECTION } from './selection';

// Level 1.4-like path A–B=C–D as 0–1=2–3, laid out on a line.
const path = pathGraph(4);
const garden = createGardenState({
  graph: path,
  matching: unwrap(createMatching(path, [[1, 2]])),
  allowed: ['join', 'split', 'passLantern', 'chain', 'markRoot'],
});
const positions = [0, 1, 2, 3].map((i) => ({ x: 100 + 60 * i, y: 100 }));
const at = (v: number) => positions[v] as { x: number; y: number };

/** Presses at a point and lets go there: a plain touch. */
const touch = (pointer: ReturnType<typeof initialPointer>, v: number) => {
  const pressed = pressStart(pointer, garden, positions, at(v));
  return pressEnd(pressed, garden, positions, at(v));
};

describe('pointer: touches and drags', () => {
  it('two touches join two sprouts in the dark', () => {
    const first = touch(initialPointer('lanterns'), 0);
    expect(first.action).toBeNull();
    expect(touch(first.pointer, 3).action).toEqual({ type: 'join', u: 0, v: 3 });
  });

  it('dragging across sprouts makes a chain, and letting go applies it', () => {
    let pointer = pressStart(initialPointer('lanterns'), garden, positions, at(0));
    for (const v of [1, 2, 3]) pointer = pressMove(pointer, garden, positions, at(v)).pointer;
    const released = pressEnd(pointer, garden, positions, at(3));
    expect(released.action).toEqual({ type: 'chain', path: [0, 1, 2, 3] });
    expect(released.pointer.chain).toBeNull();
  });

  it('a wrong step while dragging comes back with its reason, and the chain stays', () => {
    const start = pressStart(initialPointer('lanterns'), garden, positions, at(0));
    const moved = pressMove(start, garden, positions, at(2));
    expect(moved.rejection).toMatchObject({ code: 'invalidPath', error: { code: 'notAdjacent' } });
    expect(moved.pointer.chain).toEqual([0]);
  });

  it('moving over empty ground while dragging changes nothing', () => {
    const start = pressStart(initialPointer('lanterns'), garden, positions, at(0));
    expect(pressMove(start, garden, positions, { x: 130, y: 200 })).toEqual({
      pointer: start,
      rejection: null,
    });
  });

  it('pressing a lit sprout starts no chain: it may be the second touch of a pass', () => {
    const first = touch(initialPointer('lanterns'), 0);
    const pressed = pressStart(first.pointer, garden, positions, at(1));
    expect(pressed.chain).toBeNull();
    expect(pressEnd(pressed, garden, positions, at(1)).action).toEqual({
      type: 'passLantern',
      from: 0,
      to: 1,
    });
  });

  it('other tools only touch: moving does nothing, letting go touches where it ends', () => {
    const marks = initialPointer('marks');
    const pressed = pressStart(marks, garden, positions, at(0));
    expect(pressMove(pressed, garden, positions, at(1)).pointer).toEqual(pressed);
    expect(pressEnd(pressed, garden, positions, at(0)).action).toEqual({
      type: 'markRoot',
      vertex: 0,
    });
  });

  it('within a scope (a layer, 5.2), only the sprouts it shows answer the pointer', () => {
    // A layer that shows B, C and D only: A is not there to press or to touch.
    const scope = {
      shown: [false, true, true, true],
      groupOf: [-1, 0, 1, 2],
      nodes: [1, 2, 3].map((vertex) => ({ kind: 'sprout', vertex }) as const),
    };
    const pressed = pressStart(initialPointer('lanterns'), garden, positions, at(0), scope);
    expect(pressed.chain).toBeNull();
    const moved = pressMove({ ...pressed, chain: [3] }, garden, positions, at(0), scope);
    expect(moved.pointer.chain).toEqual([3]);
    const released = pressEnd(initialPointer('marks'), garden, positions, at(0), scope);
    expect(released.action).toBeNull();
    expect(pressEnd(initialPointer('marks'), garden, positions, at(3), scope).action).toEqual({
      type: 'markRoot',
      vertex: 3,
    });
  });

  it('choosing a tool lets go of whatever was selected', () => {
    const first = touch(initialPointer('lanterns'), 0);
    expect(chooseTool(first.pointer, 'marks')).toEqual({
      tool: 'marks',
      selection: NO_SELECTION,
      chain: null,
    });
  });
});
