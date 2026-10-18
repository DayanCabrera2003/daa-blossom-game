import type { Design } from '@levels/sandbox/design';
import { importText } from '@levels/sandbox/importText';
import type { ImportAnswer } from '@services/busEvents';
import { recordDesign } from './designHistory';
import type { History } from './history';

/**
 * A text opened in the free mode's share sheet (plan 08, phase 14), read into the editor: a code
 * or a level file, held to the free mode's schema and limits by `importText`. A garden becomes the
 * design shown, recorded after the one before so a single undo goes back to it; anything else
 * leaves the editor as it was, and the answer says why, for the sheet to tell kindly.
 */

/** The editor's history after the text, and the answer for the sheet. */
export interface Imported {
  readonly history: History<Design>;
  readonly answer: ImportAnswer;
}

/** Reads `text` into `history`. */
export function importIntoHistory(history: History<Design>, text: string): Imported {
  const read = importText(text);
  if (!read.ok) return { history, answer: { ok: false, reason: read.error } };
  return { history: recordDesign(history, read.value), answer: { ok: true } };
}
