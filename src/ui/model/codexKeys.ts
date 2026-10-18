import type { CodexTab } from '@levels/codex';

/**
 * What a key does in the open Codex: the left and right arrows and PageUp and PageDown turn to the
 * previous and next open entry, Home and End go to the first and the last, and 1, 2 and 3 choose a
 * tab. Escape is the frame's, which closes every book alike (`ui/overlay.ts`). Every other key
 * keeps its usual meaning in the page (scroll with the up and down arrows, move between links with
 * Tab, follow one with Enter).
 */

/** A command of the book's keys. */
export type BookCommand =
  | { readonly kind: 'turn'; readonly step: 1 | -1 }
  | { readonly kind: 'end'; readonly step: 1 | -1 }
  | { readonly kind: 'tab'; readonly tab: CodexTab };

/** The commands, by the `key` of a keyboard event. */
const COMMANDS: Readonly<Record<string, BookCommand>> = {
  ArrowLeft: { kind: 'turn', step: -1 },
  PageUp: { kind: 'turn', step: -1 },
  ArrowRight: { kind: 'turn', step: 1 },
  PageDown: { kind: 'turn', step: 1 },
  Home: { kind: 'end', step: -1 },
  End: { kind: 'end', step: 1 },
  '1': { kind: 'tab', tab: 'intuition' },
  '2': { kind: 'tab', tab: 'formal' },
  '3': { kind: 'tab', tab: 'bridge' },
};

/** The command of a key, or null when the book leaves the key alone. */
export const bookCommand = (key: string): BookCommand | null => COMMANDS[key] ?? null;
