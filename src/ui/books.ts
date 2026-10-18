import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import './math/katex.css';
import { showCodex } from './codex/CodexBook';
import type { BooksModule } from './shell';

/**
 * The entry of the deferred books chunk, loaded by the shell with import() the first time a book
 * or the epilogue opens. The Códex is written; the Cuaderno and the epilogue come in later phases
 * (plan 07, phases 6 and 11), so asking for them closes the layer at once and the game gets its
 * input back.
 */

/** The interface texts of the books, in the only language written. */
const t = createTranslator(strings);

export const show: BooksModule['show'] = (request, frame) => {
  if (request.kind === 'book' && request.book.book === 'codex') showCodex(frame, request.book, t);
  else frame.close();
};
