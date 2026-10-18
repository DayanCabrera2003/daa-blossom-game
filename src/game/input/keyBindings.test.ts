import { describe, expect, it } from 'vitest';
import {
  BROWSER_KEYS,
  chordName,
  helpLines,
  historyKey,
  KEY_SCREENS,
  keyAction,
  keyBindings,
  pressOf,
  type KeyPress,
} from './keyBindings';

const press = (key: string, mods: { ctrl?: boolean; shift?: boolean } = {}): KeyPress => ({
  key,
  ctrl: mods.ctrl ?? false,
  shift: mods.shift ?? false,
});

describe('the one table of the keys of the game', () => {
  it.each(KEY_SCREENS)('no key does two things on the %s screen', (screen) => {
    const names = keyBindings(screen).map(({ chord }) => chordName(chord));
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(KEY_SCREENS)('no key of the %s screen is one the browser keeps for itself', (screen) => {
    const reserved = new Set(BROWSER_KEYS.map(chordName));
    for (const { chord } of keyBindings(screen)) {
      expect(reserved.has(chordName(chord)), chordName(chord)).toBe(false);
      // Ctrl with a digit switches the browser's tabs; Alt opens its menus.
      if (chord.ctrl === true) expect(chord.key).not.toMatch(/^\d$/);
    }
  });

  it('every screen moves the focus with Tab, presses with Enter and Space, and has Escape', () => {
    for (const screen of KEY_SCREENS) {
      expect(keyAction(screen, press('Tab'))).toBe('focusNext');
      expect(keyAction(screen, press('Tab', { shift: true }))).toBe('focusPrevious');
      expect(keyAction(screen, press('Enter'))).toBe('press');
      expect(keyAction(screen, press(' '))).toBe('press');
      expect(keyAction(screen, press('Escape'))).toBe('escape');
    }
  });

  it('the arrows move the focus on every screen but the credits, where they roll the text', () => {
    for (const screen of KEY_SCREENS.filter((one) => one !== 'credits')) {
      expect(keyAction(screen, press('ArrowDown'))).toBe('focusDown');
      expect(keyAction(screen, press('ArrowLeft'))).toBe('focusLeft');
    }
    expect(keyAction('credits', press('ArrowDown'))).toBe('rollDown');
    expect(keyAction('credits', press('ArrowLeft'))).toBeNull();
  });

  it('F and Shift+F still find the secret flowers of the hub', () => {
    expect(keyAction('hub', press('f'))).toBe('flowerNext');
    expect(keyAction('hub', press('F', { shift: true }))).toBe('flowerPrevious');
    expect(keyAction('level', press('f'))).toBeNull();
  });

  it('the digits answer a question in a level and take a tool in the editor', () => {
    expect(keyAction('level', press('3'))).toBe('answer');
    expect(keyAction('level', press('0'))).toBe('answer');
    expect(keyAction('editor', press('3'))).toBe('tool');
    expect(keyAction('editor', press('6'))).toBeNull();
  });

  it('a letter is the same key in either case, but Shift and Ctrl count', () => {
    expect(keyAction('hub', press('M'))).toBe('mute');
    expect(keyAction('hub', press('m', { ctrl: true }))).toBeNull();
    expect(keyAction('settings', press('ArrowRight', { shift: true }))).toBeNull();
  });
});

describe('undo and redo, the same in a level, its counterexample and the editor', () => {
  it('Ctrl+Z undoes; Ctrl+Y and Ctrl+Shift+Z redo; nothing without Ctrl', () => {
    expect(historyKey(press('z', { ctrl: true }))).toBe('undo');
    expect(historyKey(press('Z', { ctrl: true, shift: true }))).toBe('redo');
    expect(historyKey(press('y', { ctrl: true }))).toBe('redo');
    expect(historyKey(press('z'))).toBeNull();
    expect(historyKey(press('x', { ctrl: true }))).toBeNull();
  });

  it('the table agrees', () => {
    for (const screen of ['level', 'counterexample', 'editor'] as const) {
      expect(keyAction(screen, press('z', { ctrl: true }))).toBe('undo');
      expect(keyAction(screen, press('z', { ctrl: true, shift: true }))).toBe('redo');
      expect(keyAction(screen, press('y', { ctrl: true }))).toBe('redo');
    }
  });
});

describe('the card of the keys', () => {
  it('lists each line once, the teacher lines only in teacher mode', () => {
    const player = helpLines('level', false);
    const teacher = helpLines('level', true);
    expect(new Set(player).size).toBe(player.length);
    expect(player).not.toContain('teacher');
    expect(teacher).toContain('teacher');
    expect(teacher.length).toBe(player.length + 1);
  });

  it('the hub tells the flowers, a level the answers', () => {
    expect(helpLines('hub', false)).toContain('flowers');
    expect(helpLines('level', false)).toContain('answer');
    expect(helpLines('hub', false)).not.toContain('answer');
  });
});

describe('a key event of the browser', () => {
  it('reads its key and modifiers, Cmd as Ctrl', () => {
    const event = { key: 'z', ctrlKey: false, metaKey: true, shiftKey: true };
    expect(pressOf(event)).toEqual({ key: 'z', ctrl: true, shift: true });
  });
});
