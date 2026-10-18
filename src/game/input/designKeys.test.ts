import { describe, expect, it } from 'vitest';
import { designKey, type DesignKeyContext } from './designKeys';

const CALM: DesignKeyContext = { cardOpen: false, menuOpen: false, selecting: false };
const press = (key: string, mods: { ctrl?: boolean; shift?: boolean } = {}) => ({
  key,
  ctrl: mods.ctrl ?? false,
  shift: mods.shift ?? false,
});

describe('the keys of the free mode editor', () => {
  it('1 to 5 take the tools in the order of the bar', () => {
    expect(['1', '2', '3', '4', '5'].map((key) => designKey(press(key), CALM))).toEqual([
      { kind: 'tool', tool: 'sprout' },
      { kind: 'tool', tool: 'vine' },
      { kind: 'tool', tool: 'lantern' },
      { kind: 'tool', tool: 'move' },
      { kind: 'tool', tool: 'remove' },
    ]);
    expect(designKey(press('6'), CALM)).toBeNull();
  });

  it('Ctrl+Z undoes; Ctrl+Y and Ctrl+Shift+Z redo, as in a level', () => {
    expect(designKey(press('z', { ctrl: true }), CALM)).toEqual({ kind: 'undo' });
    expect(designKey(press('Z', { ctrl: true, shift: true }), CALM)).toEqual({ kind: 'redo' });
    expect(designKey(press('y', { ctrl: true }), CALM)).toEqual({ kind: 'redo' });
    expect(designKey(press('z'), CALM)).toBeNull();
  });

  it('G opens the generate menu, and closes it', () => {
    expect(designKey(press('g'), CALM)).toEqual({ kind: 'openMenu' });
    expect(designKey(press('G'), { ...CALM, menuOpen: true })).toEqual({ kind: 'closeMenu' });
  });

  it('Escape closes the innermost thing: the card, the menu, the sprout chosen, then the editor', () => {
    const escape = press('Escape');
    expect(designKey(escape, { cardOpen: true, menuOpen: true, selecting: true })).toEqual({
      kind: 'closeCard',
    });
    expect(designKey(escape, { ...CALM, menuOpen: true, selecting: true })).toEqual({
      kind: 'closeMenu',
    });
    expect(designKey(escape, { ...CALM, selecting: true })).toEqual({ kind: 'letGo' });
    expect(designKey(escape, CALM)).toEqual({ kind: 'leave' });
  });

  it('while the card is open only it listens (Enter closes it too); the menu takes no edits', () => {
    const card = { ...CALM, cardOpen: true };
    expect(designKey(press('Enter'), card)).toEqual({ kind: 'closeCard' });
    expect(designKey(press('1'), card)).toBeNull();
    expect(designKey(press('z', { ctrl: true }), card)).toBeNull();
    const menu = { ...CALM, menuOpen: true };
    expect(designKey(press('1'), menu)).toBeNull();
    expect(designKey(press('z', { ctrl: true }), menu)).toBeNull();
    expect(designKey(press('Enter'), CALM)).toBeNull();
  });
});
