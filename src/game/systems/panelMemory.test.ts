import { describe, expect, it } from 'vitest';
import { forgetPanel, NO_PANELS_MOVED, recallPanel, rememberPanel } from './panelMemory';

describe('where the player left each kind of panel', () => {
  it('nothing is remembered at first', () => {
    expect(recallPanel(NO_PANELS_MOVED, 'question')).toBeNull();
  });

  it('remembers where a kind of panel was dropped, apart from the other kinds', () => {
    const memory = rememberPanel(NO_PANELS_MOVED, 'question', { x: 10, y: 20 });
    expect(recallPanel(memory, 'question')).toEqual({ x: 10, y: 20 });
    expect(recallPanel(memory, 'toast')).toBeNull();
    // A new drop replaces the old one; the memory before it is left as it was.
    const again = rememberPanel(memory, 'question', { x: 30, y: 40 });
    expect(recallPanel(again, 'question')).toEqual({ x: 30, y: 40 });
    expect(recallPanel(memory, 'question')).toEqual({ x: 10, y: 20 });
  });

  it('forgets a kind, so its panel places itself again', () => {
    const memory = rememberPanel(
      rememberPanel(NO_PANELS_MOVED, 'question', { x: 1, y: 2 }),
      'card',
      { x: 3, y: 4 },
    );
    const forgotten = forgetPanel(memory, 'question');
    expect(recallPanel(forgotten, 'question')).toBeNull();
    expect(recallPanel(forgotten, 'card')).toEqual({ x: 3, y: 4 });
  });
});
