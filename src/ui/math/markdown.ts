import {
  Marked,
  type RendererObject,
  type TokenizerAndRendererExtension,
  type Tokens,
} from 'marked';
import { matchMath } from '@ui/model/mathSpans';
import { renderMath, type MathMode } from './renderMath';

/**
 * The Markdown of the Codex entries (plan 07, §1.1) as HTML: marked, plus formulas in KaTeX, holes
 * for what the book draws itself (the diagrams, the bridge table, the glossary) and links between
 * entries. The book fills the holes and follows the links; this module only writes the HTML.
 */

/** The code blocks the book fills itself: each becomes an empty element with this class. */
const HOLES: Readonly<Record<string, string>> = {
  diagram: 'codex-diagram',
  bridge: 'codex-bridge',
  glossary: 'codex-glossary',
};

/** A link to an entry (`#C8`) or to one of its results (`#C8-T8.1`). */
const ENTRY_LINK = /^#(C\d+)(?:-(\S+))?$/;

/** Text made safe inside an HTML attribute or element. */
const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** The token of a formula, as the math extensions below make it. */
interface MathToken extends Tokens.Generic {
  readonly tex: string;
  readonly display: boolean;
}

/**
 * The two math extensions: a display formula on its own lines is a block (no paragraph around it),
 * and any other formula is inline. Both read the formula with `matchMath`, so they agree with the
 * content tests on where formulas are; marked keeps code and `\$` away from them by itself.
 */
function mathExtensions(mode: MathMode): TokenizerAndRendererExtension[] {
  const renderer = (token: Tokens.Generic): string =>
    renderMath((token as MathToken).tex, (token as MathToken).display, mode);
  return [
    {
      name: 'mathBlock',
      level: 'block',
      // Where a display formula may open a line, so a paragraph above it ends there.
      start: (src) => {
        const line = /(^|\n)\$\$/.exec(src);
        return line === null ? undefined : line.index + (line[1] ?? '').length;
      },
      tokenizer(src): MathToken | undefined {
        const formula = matchMath(src);
        // Only a display formula that ends its line is a block; the rest belongs to a paragraph.
        const after =
          formula?.display === true ? /^[ \t]*(?:\n|$)/.exec(src.slice(formula.raw.length)) : null;
        if (formula === null || after === null) return undefined;
        return { type: 'mathBlock', raw: formula.raw + after[0], tex: formula.tex, display: true };
      },
      renderer: (token) => `${renderer(token)}\n`,
    },
    {
      name: 'math',
      level: 'inline',
      start: (src) => {
        const index = src.indexOf('$');
        return index < 0 ? undefined : index;
      },
      tokenizer(src): MathToken | undefined {
        const formula = matchMath(src);
        return formula === null ? undefined : { type: 'math', ...formula };
      },
      renderer,
    },
  ];
}

/** The renderers of the holes and of the links between entries; anything else renders as usual. */
const RENDERER: RendererObject = {
  code({ text, lang }) {
    const hole = HOLES[lang ?? ''];
    if (hole === undefined) return false;
    const data = lang === 'diagram' ? escapeHtml(text) : '';
    return `<div class="${hole}" data-${lang}="${data}"></div>\n`;
  },
  link({ href, tokens }) {
    const link = ENTRY_LINK.exec(href);
    if (link === null) return false;
    const result = link[2] === undefined ? '' : ` data-codex-result="${escapeHtml(link[2])}"`;
    const text = this.parser.parseInline(tokens);
    return `<a href="${escapeHtml(href)}" data-codex-entry="${link[1]}"${result}>${text}</a>`;
  },
};

/** One marked instance per mode, built on first use. */
const instances = new Map<MathMode, Marked>();

/** The marked instance of `mode`. */
function markedFor(mode: MathMode): Marked {
  let instance = instances.get(mode);
  if (instance === undefined) {
    instance = new Marked({ extensions: mathExtensions(mode), renderer: RENDERER });
    instances.set(mode, instance);
  }
  return instance;
}

/**
 * The HTML of a piece of Markdown of the Codex. In `strict` mode (the content tests) an invalid
 * formula throws; in `lenient` mode (the books) it shows in red.
 */
export function markdownToHtml(markdown: string, mode: MathMode = 'lenient'): string {
  return markedFor(mode).parse(markdown, { async: false });
}
