import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, current, push, redo, seek, startHistory, undo } from './history';

describe('history of the garden', () => {
  it('starts at the first state, with nothing to undo or redo', () => {
    const history = startHistory('dawn');
    expect(current(history)).toBe('dawn');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('undo and redo walk back and forth, as often as wanted (GDD §2.7)', () => {
    const history = push(push(startHistory('a'), 'b'), 'c');
    expect(current(undo(history))).toBe('b');
    expect(current(undo(undo(history)))).toBe('a');
    expect(current(redo(undo(undo(history))))).toBe('b');
    expect(undo(startHistory('a'))).toEqual(startHistory('a'));
    expect(redo(history)).toEqual(history);
  });

  it('acting after undoing drops the undone future', () => {
    const history = push(undo(push(push(startHistory('a'), 'b'), 'c')), 'x');
    expect(history.states).toEqual(['a', 'b', 'x']);
    expect(canRedo(history)).toBe(false);
  });

  it('the sun moves the cursor anywhere in the day, clamped to it (GDD 0.5)', () => {
    const history = push(push(startHistory('a'), 'b'), 'c');
    expect(current(seek(history, 0))).toBe('a');
    expect(current(seek(history, 1))).toBe('b');
    expect(seek(history, 9).cursor).toBe(2);
    expect(seek(history, -3).cursor).toBe(0);
  });

  it('never changes the history it was given', () => {
    const history = push(startHistory('a'), 'b');
    undo(history);
    push(history, 'c');
    expect(history).toEqual({ states: ['a', 'b'], cursor: 1 });
  });

  it('property: undoing everything and redoing everything comes back to the same state', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 20 }), (moves) => {
        const full = moves.reduce((history, move) => push(history, move), startHistory(-1));
        let back = full;
        while (canUndo(back)) back = undo(back);
        expect(current(back)).toBe(-1);
        let forth = back;
        while (canRedo(forth)) forth = redo(forth);
        expect(forth).toEqual(full);
      }),
    );
  });
});
