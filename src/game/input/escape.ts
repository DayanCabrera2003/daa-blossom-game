/**
 * What the Escape key does (plan 09, phase 4), one rule for every screen of the canvas: it closes
 * the innermost thing open, and only when nothing is open does it leave the screen. A player
 * closing a panel should never lose the level under it. The books over the canvas follow the same
 * rule on their own: Escape closes the book.
 */

/** What Escape asks for. */
export type EscapeAction =
  | 'closeKeys'
  | 'closeSettings'
  | 'closeCard'
  | 'closeMenu'
  | 'letGo'
  | 'leaveLayer'
  | 'leave'
  | 'blur';

/** What is open on the screen when Escape is pressed; what a screen does not have is left out. */
export interface EscapeContext {
  /** The card of the keys, opened from the settings panel. */
  readonly keysOpen?: boolean;
  /** The settings panel. */
  readonly settingsOpen?: boolean;
  /** A mechanic card. */
  readonly cardOpen?: boolean;
  /** The free mode's generate menu. */
  readonly menuOpen?: boolean;
  /** A sprout chosen in the free mode's editor, waiting for the second touch of a vine. */
  readonly selecting?: boolean;
  /** A flower entered with the layers (5.2). */
  readonly insideLayer?: boolean;
  /** Whether the screen can be left: the hub cannot, so there Escape only takes the focus away. */
  readonly canLeave: boolean;
}

/**
 * The innermost thing open, in one order for every screen: the card of the keys, the settings
 * panel, a mechanic card, the generate menu, the sprout chosen, the flower entered; then the screen
 * is left, or on the hub the keyboard's focus goes.
 */
export function escapeAction(context: EscapeContext): EscapeAction {
  if (context.keysOpen === true) return 'closeKeys';
  if (context.settingsOpen === true) return 'closeSettings';
  if (context.cardOpen === true) return 'closeCard';
  if (context.menuOpen === true) return 'closeMenu';
  if (context.selecting === true) return 'letGo';
  if (context.insideLayer === true) return 'leaveLayer';
  return context.canLeave ? 'leave' : 'blur';
}
