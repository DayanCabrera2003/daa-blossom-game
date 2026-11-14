import { describe, expect, it } from 'vitest';
import { NO_PRESSES, pressDown, pressHeld, pressUp } from './gardenPresses';

describe('the presses that reached the garden', () => {
  it('a press on the garden is held until its own pointer lets go', () => {
    const down = pressDown(NO_PRESSES, 1, true);
    expect(down.send).toBe(true);
    expect(pressHeld(down.presses, 1)).toBe(true);
    expect(pressHeld(down.presses, 2)).toBe(false);
    const up = pressUp(down.presses, 1, { free: true, outside: false });
    expect(up.send).toBe('release');
    expect(pressHeld(up.presses, 1)).toBe(false);
  });

  it('a press that was not on the garden is not held, and its release is nobody’s', () => {
    const down = pressDown(NO_PRESSES, 1, false);
    expect(down.send).toBe(false);
    expect(pressUp(down.presses, 1, { free: true, outside: false }).send).toBeNull();
    expect(pressUp(down.presses, 1, { free: true, outside: true }).send).toBeNull();
  });

  it('a press off the garden forgets an older press of the same pointer', () => {
    const held = pressDown(NO_PRESSES, 1, true).presses;
    const again = pressDown(held, 1, false);
    expect(pressHeld(again.presses, 1)).toBe(false);
  });

  it('a held press let go outside the screen, or off the garden, ends with no chain', () => {
    const held = pressDown(NO_PRESSES, 1, true).presses;
    expect(pressUp(held, 1, { free: true, outside: true }).send).toBe('letGo');
    expect(pressUp(held, 1, { free: false, outside: false }).send).toBe('letGo');
  });

  it('two pointers are paired each with its own press', () => {
    const one = pressDown(NO_PRESSES, 1, true).presses;
    const two = pressDown(one, 2, true).presses;
    const first = pressUp(two, 1, { free: true, outside: false });
    expect(pressHeld(first.presses, 2)).toBe(true);
    expect(pressUp(first.presses, 2, { free: true, outside: false }).send).toBe('release');
  });
});
