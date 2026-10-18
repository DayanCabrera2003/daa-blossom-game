import { itemAt } from '@core/shared/itemAt';
import { DESIGN_TOOLS, type DesignTool } from './designIntent';

/**
 * The keyboard of the free mode's editor (plan 08, phase 11), so it can be used without the mouse
 * as much as with it: 1 to 5 take the tools in the order of the bar, Ctrl/Cmd+Z undoes and
 * Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redoes (as in a level), G opens and closes the generate menu, and
 * Escape closes the innermost thing open (the card, the menu, the sprout chosen for a vine) before
 * it leaves the editor. Pure: the scene reads the key and does what this says.
 */

/** A key pressed, as the scene reads it from the browser's event. */
export interface DesignKeyPress {
  /** `KeyboardEvent.key`: "1", "z", "Z", "Escape", "Enter"… */
  readonly key: string;
  /** Ctrl, or Cmd on a Mac. */
  readonly ctrl: boolean;
  readonly shift: boolean;
}

/** What is open in the editor when a key is pressed. */
export interface DesignKeyContext {
  /** The mechanic card is showing: it alone listens. */
  readonly cardOpen: boolean;
  /** The generate menu is open: the design is not edited meanwhile. */
  readonly menuOpen: boolean;
  /** A sprout is chosen, waiting for the second touch of a vine. */
  readonly selecting: boolean;
}

/** What a key asks the editor to do. */
export type DesignCommand =
  | { readonly kind: 'tool'; readonly tool: DesignTool }
  | { readonly kind: 'undo' }
  | { readonly kind: 'redo' }
  | { readonly kind: 'openMenu' }
  | { readonly kind: 'closeMenu' }
  | { readonly kind: 'closeCard' }
  | { readonly kind: 'letGo' }
  | { readonly kind: 'leave' };

/** The tool a digit takes, if any: 1 for the first tool of the bar. */
function toolOf(key: string): DesignTool | null {
  const digit = Number(key);
  if (!/^\d$/.test(key) || digit < 1 || digit > DESIGN_TOOLS.length) return null;
  return itemAt(DESIGN_TOOLS, digit - 1);
}

/** What `press` asks for with `context` open, or null when it asks for nothing. */
export function designKey(press: DesignKeyPress, context: DesignKeyContext): DesignCommand | null {
  const key = press.key.toLowerCase();
  if (context.cardOpen) {
    return key === 'escape' || key === 'enter' ? { kind: 'closeCard' } : null;
  }
  if (context.menuOpen) {
    return key === 'escape' || key === 'g' ? { kind: 'closeMenu' } : null;
  }
  if (press.ctrl) {
    if (key === 'y' || (key === 'z' && press.shift)) return { kind: 'redo' };
    return key === 'z' ? { kind: 'undo' } : null;
  }
  if (key === 'escape') return context.selecting ? { kind: 'letGo' } : { kind: 'leave' };
  if (key === 'g') return { kind: 'openMenu' };
  const tool = toolOf(key);
  return tool === null ? null : { kind: 'tool', tool };
}
