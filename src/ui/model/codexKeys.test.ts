import { describe, expect, it } from 'vitest';
import { bookCommand } from './codexKeys';

describe('the keys of the Codex', () => {
  it('the arrows and the page keys turn the pages', () => {
    for (const key of ['ArrowLeft', 'PageUp'])
      expect(bookCommand(key)).toEqual({ kind: 'turn', step: -1 });
    for (const key of ['ArrowRight', 'PageDown'])
      expect(bookCommand(key)).toEqual({ kind: 'turn', step: 1 });
  });

  it('1, 2 and 3 choose the intuition, the formal tab and the bridge', () => {
    expect(['1', '2', '3'].map(bookCommand)).toEqual([
      { kind: 'tab', tab: 'intuition' },
      { kind: 'tab', tab: 'formal' },
      { kind: 'tab', tab: 'bridge' },
    ]);
  });

  it('Home and End go to the first and the last open entry', () => {
    expect(bookCommand('Home')).toEqual({ kind: 'end', step: -1 });
    expect(bookCommand('End')).toEqual({ kind: 'end', step: 1 });
  });

  it('any other key is left alone, so the page can still scroll and links be followed', () => {
    // Escape too: the frame closes every book with it.
    for (const key of ['Escape', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', '4', 'a']) {
      expect(bookCommand(key)).toBeNull();
    }
  });
});
