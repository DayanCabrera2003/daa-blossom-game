import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import { createLines } from '@services/lines';
import './math/katex.css';
import { showCodex } from './codex/CodexBook';
import { showNotebook } from './notebook/NotebookBook';
import type { BooksModule } from './shell';

/**
 * The entry of the deferred books chunk, loaded by the shell with import() the first time a book
 * or the epilogue opens: the Códex and the Cuaderno. The epilogue comes in a later phase (plan 07,
 * phase 11), so asking for it closes the layer at once and the game gets its input back.
 */

/** The interface texts of the books, in the only language written. */
const t = createTranslator(strings);

/** The dialogue lines the notebook's statements are written in. */
const line = createLines(lines);

export const show: BooksModule['show'] = (request, frame) => {
  if (request.kind !== 'book') frame.close();
  else if (request.book.book === 'codex') showCodex(frame, request.book, t);
  else showNotebook(frame, t, line);
};
