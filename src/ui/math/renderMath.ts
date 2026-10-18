import katex, { type KatexOptions } from 'katex';

/**
 * How a formula that KaTeX cannot render is handled. `strict` throws, for the content tests: every
 * formula of the Codex must be valid LaTeX. `lenient` is the books' mode: the formula shows its
 * source in red and the page goes on, so one typo never breaks a book.
 */
export type MathMode = 'strict' | 'lenient';

/** The KaTeX options of each mode. */
const OPTIONS: Readonly<Record<MathMode, KatexOptions>> = {
  strict: { throwOnError: true, strict: 'error' },
  // KaTeX's default red for errors; what LaTeX would reject but KaTeX accepts only warns.
  lenient: { throwOnError: false, strict: 'warn', errorColor: '#cc0000' },
};

/** The HTML of one formula: inline, or on its own line when `display` is set. */
export function renderMath(tex: string, display: boolean, mode: MathMode = 'lenient'): string {
  return katex.renderToString(tex, { ...OPTIONS[mode], displayMode: display });
}
