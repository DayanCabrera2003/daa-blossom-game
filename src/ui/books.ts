import './math/katex.css';
import type { BooksModule } from './shell';

/**
 * The entry of the deferred books chunk, loaded by the shell with import() the first time a book
 * or the epilogue opens. The Códex, the Cuaderno and the epilogue are not written yet, so nothing
 * is shown: the layer closes at once and the game gets its input back.
 */
export const show: BooksModule['show'] = (_request, frame) => frame.close();
