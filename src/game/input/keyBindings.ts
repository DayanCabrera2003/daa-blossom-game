/**
 * Every key of the game, screen by screen, in one table (plan 09, phase 4): what each key does on
 * the hub, in a level and its counterexample, in the free mode's editor, on the settings panel and
 * on the credits. The tests hold it free of a key doing two things on one screen and of the keys the
 * browser keeps for itself; the focus controller and the hub's flowers read their keys here, and
 * the card of the keys on the settings panel lists its lines. The garden itself is played with the
 * pointer or a touch (plan 09, phase 5 dropped): no key makes a move. The books over the canvas
 * keep their own keys (`ui/model/codexKeys.ts`) and the game takes none while one is open.
 */

/** The screens of the canvas, each with its own keys. */
export const KEY_SCREENS = [
  'hub',
  'level',
  'counterexample',
  'editor',
  'settings',
  'credits',
] as const;

/** A screen of the canvas. */
export type KeyScreen = (typeof KEY_SCREENS)[number];

/** A key with its modifiers, by the browser's `KeyboardEvent.key` (a letter in either case). */
export interface KeyChord {
  readonly key: string;
  readonly ctrl?: true;
  readonly shift?: true;
}

/** A key pressed, as a scene reads it from the browser's event (Cmd counts as Ctrl on a Mac). */
export interface KeyPress {
  readonly key: string;
  readonly ctrl: boolean;
  readonly shift: boolean;
}

/** What a key asks for. */
export type KeyAction =
  | 'focusNext'
  | 'focusPrevious'
  | 'focusUp'
  | 'focusDown'
  | 'focusLeft'
  | 'focusRight'
  | 'press'
  | 'escape'
  | 'mute'
  | 'flowerNext'
  | 'flowerPrevious'
  | 'answer'
  | 'undo'
  | 'redo'
  | 'tool'
  | 'generate'
  | 'teacherPanel'
  | 'teacherPrevious'
  | 'teacherNext'
  | 'rollUp'
  | 'rollDown'
  | 'pageUp'
  | 'pageDown';

/** The lines of the card of the keys, each a text `keys.<line>` of `strings.json`. */
export const KEY_HELP = [
  'focus',
  'slider',
  'press',
  'answer',
  'undo',
  'flowers',
  'tools',
  'generate',
  'roll',
  'escape',
  'mute',
  'teacher',
] as const;

/** A line of the card of the keys. */
export type KeyHelp = (typeof KEY_HELP)[number];

/** One key of a screen: the key, what it does, the line of the card that tells it. */
export interface KeyBinding {
  readonly chord: KeyChord;
  readonly action: KeyAction;
  readonly help: KeyHelp;
  /** Only in teacher mode. */
  readonly teacher?: true;
}

/** A row of the table. */
const bind = (
  key: string,
  action: KeyAction,
  help: KeyHelp,
  mods: { readonly ctrl?: true; readonly shift?: true; readonly teacher?: true } = {},
): KeyBinding => {
  const { teacher, ...chord } = mods;
  return { chord: { key, ...chord }, action, help, ...(teacher === undefined ? {} : { teacher }) };
};

/** Tab and Shift+Tab go from one pressable thing to the next; Enter and Space press it. */
const FOCUS = [
  bind('Tab', 'focusNext', 'focus'),
  bind('Tab', 'focusPrevious', 'focus', { shift: true }),
  bind('Enter', 'press', 'press'),
  bind(' ', 'press', 'press'),
];

/** The arrows go to the thing above, below or beside; the side ones move a slider in focus. */
const ARROWS = [
  bind('ArrowUp', 'focusUp', 'focus'),
  bind('ArrowDown', 'focusDown', 'focus'),
  bind('ArrowLeft', 'focusLeft', 'slider'),
  bind('ArrowRight', 'focusRight', 'slider'),
];

/** Escape closes the innermost thing open, or leaves the screen (`input/escape.ts`). */
const ESCAPE = bind('Escape', 'escape', 'escape');

/** M mutes or unmutes wherever the settings' gear is. */
const MUTE = bind('m', 'mute', 'mute');

/** Undo and redo, as in every program: Ctrl+Z, and Ctrl+Y or Ctrl+Shift+Z. */
const HISTORY = [
  bind('z', 'undo', 'undo', { ctrl: true }),
  bind('y', 'redo', 'undo', { ctrl: true }),
  bind('z', 'redo', 'undo', { ctrl: true, shift: true }),
];

/** The digits, each `action` (an answer of a question, a tool of the editor). */
const digits = (from: number, to: number, action: KeyAction, help: KeyHelp): KeyBinding[] =>
  Array.from({ length: to - from + 1 }, (_, i) => bind(String(from + i), action, help));

/** The table: every key of every screen. */
const TABLE: Readonly<Record<KeyScreen, readonly KeyBinding[]>> = {
  hub: [
    ...FOCUS,
    ...ARROWS,
    ESCAPE,
    MUTE,
    bind('f', 'flowerNext', 'flowers'),
    bind('f', 'flowerPrevious', 'flowers', { shift: true }),
  ],
  level: [
    ...FOCUS,
    ...ARROWS,
    ESCAPE,
    MUTE,
    ...HISTORY,
    ...digits(0, 9, 'answer', 'answer'),
    bind('t', 'teacherPanel', 'teacher', { teacher: true }),
    bind('PageUp', 'teacherPrevious', 'teacher', { teacher: true }),
    bind('PageDown', 'teacherNext', 'teacher', { teacher: true }),
  ],
  counterexample: [...FOCUS, ...ARROWS, ESCAPE, ...HISTORY],
  editor: [
    ...FOCUS,
    ...ARROWS,
    ESCAPE,
    ...HISTORY,
    ...digits(1, 5, 'tool', 'tools'),
    bind('g', 'generate', 'generate'),
  ],
  settings: [...FOCUS, ...ARROWS, ESCAPE, MUTE],
  credits: [
    ...FOCUS,
    ESCAPE,
    bind('ArrowUp', 'rollUp', 'roll'),
    bind('ArrowDown', 'rollDown', 'roll'),
    bind('PageUp', 'pageUp', 'roll'),
    bind('PageDown', 'pageDown', 'roll'),
  ],
};

/**
 * Keys the browser keeps for itself or that would take the player out of the game: closing,
 * opening and switching tabs and windows, reloading, going back, the address bar, the developer
 * tools, full screen.
 */
export const BROWSER_KEYS: readonly KeyChord[] = [
  { key: 'w', ctrl: true },
  { key: 't', ctrl: true },
  { key: 'n', ctrl: true },
  { key: 'n', ctrl: true, shift: true },
  { key: 't', ctrl: true, shift: true },
  { key: 'q', ctrl: true },
  { key: 'r', ctrl: true },
  { key: 'l', ctrl: true },
  { key: 'Tab', ctrl: true },
  { key: 'Tab', ctrl: true, shift: true },
  { key: 'PageUp', ctrl: true },
  { key: 'PageDown', ctrl: true },
  { key: 'i', ctrl: true, shift: true },
  { key: 'F5' },
  { key: 'F11' },
  { key: 'F12' },
];

/** A chord's name, the same for a letter in either case: "Ctrl+Shift+Z", "Tab", "M". */
export function chordName(chord: KeyChord): string {
  const key = chord.key.length === 1 ? chord.key.toUpperCase() : chord.key;
  return `${chord.ctrl === true ? 'Ctrl+' : ''}${chord.shift === true ? 'Shift+' : ''}${key}`;
}

/** The keys of `screen`. */
export const keyBindings = (screen: KeyScreen): readonly KeyBinding[] => TABLE[screen];

/** What `press` does on `screen`, or null when the key does nothing there. */
export function keyAction(screen: KeyScreen, press: KeyPress): KeyAction | null {
  const name = chordName({
    key: press.key,
    ...(press.ctrl ? { ctrl: true } : {}),
    ...(press.shift ? { shift: true } : {}),
  });
  return TABLE[screen].find(({ chord }) => chordName(chord) === name)?.action ?? null;
}

/** Whether `press` undoes or redoes, by the keys every screen with a history shares. */
export function historyKey(press: KeyPress): 'undo' | 'redo' | null {
  const action = keyAction('editor', press);
  return action === 'undo' || action === 'redo' ? action : null;
}

/** The lines of the card of the keys of `screen`, once each, the teacher's only in teacher mode. */
export function helpLines(screen: KeyScreen, teacherMode: boolean): KeyHelp[] {
  const shown = TABLE[screen].filter((binding) => teacherMode || binding.teacher !== true);
  return KEY_HELP.filter((line) => shown.some((binding) => binding.help === line));
}
