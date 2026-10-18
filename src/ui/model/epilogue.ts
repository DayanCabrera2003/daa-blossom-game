import type { CodexEntryId, OpenTabs } from '@levels/codex';
import type { Capabilities } from '@services/busEvents';

/**
 * What the epilogue "Más allá del jardín" offers (GDD §7; plan 07, phase 11), decided without the
 * DOM: a sober screen with no puzzle, which tells three real uses of what the player did in the
 * garden, closes with a note from the author, and offers its ways on: reading the last entry of
 * the Codex, the free mode once the game announces it exists (plan 08 registers it), and going back
 * to the garden. The texts are keys of `strings.json`; `ui/epilogue/` only builds the DOM.
 */

/** The entry of the Codex the epilogue opens: the mathematics of the uses it tells. */
export const EPILOGUE_ENTRY: CodexEntryId = 'C14';

/** The real uses the epilogue tells, in the garden's words, in the order shown. */
export const EPILOGUE_USES = ['epilogue.kidneys', 'epilogue.molecules', 'epilogue.pairs'] as const;

/** A way on from the epilogue. */
export type EpilogueChoice = 'readCodex' | 'sandbox' | 'back';

/** A button of the epilogue: what it does and the key of its words. */
export interface EpilogueButton {
  readonly choice: EpilogueChoice;
  readonly label: string;
}

/**
 * The buttons of the epilogue, in order, given what the Codex has open and what the game can do:
 * reading the entry of the uses (when it is open, as it is once the last level is won), the free
 * mode only when the game announces it, and always, last, the way back to the garden.
 */
export function epilogueChoices(open: OpenTabs, capabilities: Capabilities): EpilogueButton[] {
  const buttons: EpilogueButton[] = [];
  if (open.has(EPILOGUE_ENTRY)) buttons.push({ choice: 'readCodex', label: 'epilogue.readCodex' });
  if (capabilities.sandbox) buttons.push({ choice: 'sandbox', label: 'epilogue.sandbox' });
  buttons.push({ choice: 'back', label: 'epilogue.back' });
  return buttons;
}

/**
 * The paragraphs of a text written with a blank line between them (the author's closing note is
 * one string of `strings.json`), each trimmed; blank paragraphs are dropped.
 */
export const paragraphsOf = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
