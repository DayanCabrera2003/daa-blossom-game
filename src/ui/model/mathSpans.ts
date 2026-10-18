/**
 * Where the formulas of a Codex entry are: inline `$…$` and display `$$…$$`, written in the
 * Markdown of the entries (plan 07, §1.1). The Markdown extension of the books reads one formula at
 * a time with `matchMath`; the content tests split a whole entry with `mathSpans` to render every
 * formula in it. An escaped `\$` is a plain dollar, and code (spans and fenced blocks) keeps its
 * dollars as written.
 *
 * Inline math follows the usual TeX-in-Markdown rule, so prices never turn into formulas: the
 * opening dollar is followed by a non-space, the closing one follows a non-space and no digit
 * follows it, and a formula never runs across a blank line.
 */

/** A formula read at the start of a text: what it took from the text, its TeX and its kind. */
export interface MathMatch {
  /** The characters the formula takes, dollars included. */
  readonly raw: string;
  /** The TeX between the dollars (trimmed for display math, which is often written on its own lines). */
  readonly tex: string;
  /** Whether it is display math (`$$…$$`) rather than inline math (`$…$`). */
  readonly display: boolean;
}

/** A piece of a Markdown text: words (code included, as written) or a formula. */
export type MathSpan =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'math'; readonly tex: string; readonly display: boolean };

/** A line that is blank: only spaces or tabs. */
const BLANK_LINE = /^[ \t]*(?:\n|$)/;

/** The formula at the very start of `src`, or null when `src` does not start with one. */
export function matchMath(src: string): MathMatch | null {
  if (src.startsWith('$$')) return matchDisplay(src);
  if (src.startsWith('$')) return matchInline(src);
  return null;
}

/** `$$…$$`: up to the next unescaped pair of dollars, with some TeX in between. */
function matchDisplay(src: string): MathMatch | null {
  for (let i = 2; i < src.length; i++) {
    if (src[i] === '\\') {
      i++; // An escaped character (`\$`, `\\`) never closes the formula.
    } else if (src.startsWith('$$', i)) {
      const tex = src.slice(2, i).trim();
      return tex === '' ? null : { raw: src.slice(0, i + 2), tex, display: true };
    }
  }
  return null;
}

/** `$…$`: tight against its dollars, on one paragraph, not followed by a digit. */
function matchInline(src: string): MathMatch | null {
  const first = src[1];
  if (first === undefined || first === '$' || /\s/.test(first)) return null;
  for (let i = 1; i < src.length; i++) {
    const char = src[i];
    if (char === '\\') {
      i++;
    } else if (char === '\n' && BLANK_LINE.test(src.slice(i + 1))) {
      return null; // A blank line ends the paragraph, and the formula with it.
    } else if (char === '$') {
      // A closing dollar must hug the formula and not start a number ("$5 and $6").
      if (/\s/.test(src[i - 1] ?? ' ') || /\d/.test(src[i + 1] ?? '')) return null;
      return { raw: src.slice(0, i + 1), tex: src.slice(1, i), display: false };
    }
  }
  return null;
}

/** Splits a Markdown text into words and formulas, in order; neighbouring words are merged. */
export function mathSpans(markdown: string): MathSpan[] {
  const spans: MathSpan[] = [];
  let words = '';
  let i = 0;
  while (i < markdown.length) {
    const rest = markdown.slice(i);
    const atLineStart = i === 0 || markdown[i - 1] === '\n';
    const fence = atLineStart ? fencedBlockLength(rest) : 0;
    const formula = fence > 0 ? null : matchMath(rest);
    if (formula !== null) {
      if (words !== '') spans.push({ kind: 'text', text: words });
      words = '';
      spans.push({ kind: 'math', tex: formula.tex, display: formula.display });
      i += formula.raw.length;
      continue;
    }
    // Code, escapes and plain characters are all words; only how far they reach differs.
    const length = fence > 0 ? fence : rest.startsWith('\\') ? 2 : codeSpanLength(rest) || 1;
    words += rest.slice(0, length);
    i += length;
  }
  if (words !== '') spans.push({ kind: 'text', text: words });
  return spans;
}

/**
 * How many characters the fenced code block at the start of `src` takes, up to and including the
 * line break after its closing fence (to the end of the text if it is never closed), or 0 when
 * `src` does not open one. A fence closes with a line of the same mark, at least as long.
 */
function fencedBlockLength(src: string): number {
  const opening = /^ {0,3}(`{3,}|~{3,})/.exec(src);
  if (opening === null) return 0;
  const mark = opening[1] ?? '';
  const closing = new RegExp(
    `\\n {0,3}${mark[0] === '`' ? '`' : '~'}{${mark.length},}[ \\t]*(?:\\n|$)`,
  );
  const found = closing.exec(src);
  return found === null ? src.length : found.index + found[0].length;
}

/**
 * How many characters the code span at the start of `src` takes, or the length of its run of
 * backticks when nothing closes it (the run is then plain text), or 0 when `src` does not start
 * with a backtick. A span closes with the next run of exactly as many backticks.
 */
function codeSpanLength(src: string): number {
  const run = /^`+/.exec(src)?.[0].length ?? 0;
  if (run === 0) return 0;
  const closing = new RegExp(`(?<!\`)\`{${run}}(?!\`)`, 'g');
  closing.lastIndex = run;
  const found = closing.exec(src);
  return found === null ? run : found.index + run;
}
