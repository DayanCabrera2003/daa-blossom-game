import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdown';

/** The HTML of a Markdown text in the strict mode of the content tests. */
const html = (markdown: string): string => markdownToHtml(markdown, 'strict');

describe('markdownToHtml: formulas', () => {
  it('renders inline formulas with KaTeX inside the paragraph', () => {
    const out = html('A matching $M$ has $|M| \\le n/2$ lines.');
    expect(out.startsWith('<p>A matching <span class="katex">')).toBe(true);
    expect(out.match(/class="katex"/g)).toHaveLength(2);
  });

  it('renders a display formula on its own lines as a block, not a paragraph', () => {
    const out = html(
      'Before.\n\n$$\n\\nu(G) = \\min_U \\tfrac12 (|V| + |U| - \\operatorname{odd}(G-U))\n$$\n\nAfter.',
    );
    expect(out).toContain('katex-display');
    expect(out).not.toMatch(/<p>\s*<span class="katex-display">/);
    expect(out).toContain('<p>After.</p>');
  });

  it('ends the paragraph above a display formula that opens a line', () => {
    const out = html('Before.\n$$\nx\n$$\nAfter.');
    expect(out.startsWith('<p>Before.</p>\n<span class="katex-display">')).toBe(true);
    expect(out.endsWith('<p>After.</p>\n')).toBe(true);
  });

  it('renders display math written inside a paragraph too', () => {
    expect(html('so $$a+b$$ holds')).toContain('katex-display');
  });

  it('keeps underscores and stars of a formula away from emphasis', () => {
    const out = html('$a_1$ and $b_1$, $x*y$ and $z*w$');
    expect(out).not.toContain('<em>');
    expect(out.match(/class="katex"/g)).toHaveLength(4);
  });

  it('keeps escaped dollars and the dollars of code as written', () => {
    expect(html('costs \\$5 or \\$6')).toBe('<p>costs $5 or $6</p>\n');
    expect(html('see `$x$`')).toBe('<p>see <code>$x$</code></p>\n');
    expect(html('```\n$x$\n```')).toBe('<pre><code>$x$\n</code></pre>\n');
  });

  it('throws on an invalid formula in strict mode, and shows it in red otherwise', () => {
    expect(() => html('bad $\\frac{1}{$ formula')).toThrow();
    expect(markdownToHtml('bad $\\frac{1}{$ formula')).toContain('katex-error');
  });
});

describe('markdownToHtml: a formula kept with what hugs it', () => {
  /** The no-wrap span the formula and its attached suffix share, or null when there is none. */
  const nowrap = (markdown: string): string | null => {
    const out = html(markdown);
    const start = out.indexOf('<span class="math-nowrap"><span class="katex">');
    // KaTeX's own spans hold no bare text after a closing tag, so the first one is the suffix.
    return start < 0 ? null : (/<\/span>([^<]+)<\/span>/.exec(out.slice(start))?.[1] ?? null);
  };

  it('keeps a hyphenated word attached to a formula on its line', () => {
    expect(nowrap('un camino $M$-aumentante corto')).toBe('-aumentante');
    expect(nowrap('los $k$-ésimos y-más')).toBe('-ésimos');
  });

  it('keeps directly attached punctuation with the formula', () => {
    expect(nowrap('el jardín $G/B$, luego')).toBe(',');
    expect(nowrap('cuando ($k=1$) basta')).toBe(')');
    expect(nowrap('y $x$.')).toBe('.');
    expect(nowrap('si $a$: y $b$; fin')).toBe(':');
    expect(nowrap('($M$-aumentante).')).toBe('-aumentante).');
  });

  it('leaves a formula with nothing attached, or a dash after a space, as it was', () => {
    expect(nowrap('una $x$ sola')).toBeNull();
    expect(nowrap('una $x$ - sola')).toBeNull();
    expect(nowrap('una $x$- sola')).toBeNull();
    expect(html('una $x$ sola')).not.toContain('math-nowrap');
    expect(html('so $$a+b$$, holds')).not.toContain('math-nowrap');
  });

  it('ends the suffix at the first character that is neither a letter nor punctuation', () => {
    expect(html('$x$-a&b')).toContain('-a</span>&amp;b');
  });
});

describe('markdownToHtml: holes the book fills', () => {
  it('leaves a diagram block as an empty hole that carries its JSON', () => {
    const out = html('```diagram\n{ "kind": "pond", "level": "2.1" }\n```');
    expect(out).toBe(
      '<div class="codex-diagram" data-diagram="{ &quot;kind&quot;: &quot;pond&quot;, &quot;level&quot;: &quot;2.1&quot; }"></div>\n',
    );
  });

  it('leaves the bridge and the glossary tables as holes', () => {
    expect(html('```bridge\n```')).toBe('<div class="codex-bridge" data-bridge=""></div>\n');
    expect(html('```glossary\n```')).toBe('<div class="codex-glossary" data-glossary=""></div>\n');
  });

  it('renders other code blocks as code', () => {
    expect(html('```ts\nconst a = 1 < 2;\n```')).toBe(
      '<pre><code class="language-ts">const a = 1 &lt; 2;\n</code></pre>\n',
    );
  });
});

describe('markdownToHtml: links between entries', () => {
  it('marks a link to an entry with the entry it opens', () => {
    expect(html('see [Berge](#C3)')).toBe(
      '<p>see <a href="#C3" data-codex-entry="C3">Berge</a></p>\n',
    );
  });

  it('marks a link to a result with its entry and the result', () => {
    expect(html('[the lemma of the **flower**](#C8-T8.1)')).toBe(
      '<p><a href="#C8-T8.1" data-codex-entry="C8" data-codex-result="T8.1">the lemma of the <strong>flower</strong></a></p>\n',
    );
  });

  it('leaves any other link as Markdown writes it', () => {
    expect(html('[KaTeX](https://katex.org "math")')).toBe(
      '<p><a href="https://katex.org" title="math">KaTeX</a></p>\n',
    );
  });
});
