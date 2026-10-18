import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import { createLines } from '@services/lines';
import './math/katex.css';
import { showCodex } from './codex/CodexBook';
import { showEpilogue } from './epilogue/EpilogueScreen';
import { showNotebook } from './notebook/NotebookBook';
import type { BooksModule } from './shell';
import { mountTeacherPanel } from './teacher/TeacherPanel';
import type { TeacherModule } from './teacherShell';

/**
 * The entry of the deferred books chunk, loaded by the shell with import() the first time a book
 * or the epilogue opens: the Códex, the Cuaderno and the epilogue "Más allá del jardín"; and, in
 * teacher mode, the trace panel, loaded the first time it opens.
 */

/** The interface texts of the books, in the only language written. */
const t = createTranslator(strings);

/** The dialogue lines the notebook's statements are written in. */
const line = createLines(lines);

export const show: BooksModule['show'] = (request, frame) => {
  if (request.kind === 'epilogue') showEpilogue(frame, t);
  else if (request.book.book === 'codex') showCodex(frame, request.book, t);
  else showNotebook(frame, t, line);
};

/** Builds the teacher's trace panel in the layer its light shell keeps (`ui/teacherShell.ts`). */
export const mountTeacher: TeacherModule['mountTeacher'] = (layer, bus) =>
  mountTeacherPanel(layer, bus, t);
