import { describe, expect, it } from 'vitest';
import { renderMath } from './renderMath';

describe('renderMath', () => {
  it('renders a valid formula to the HTML of KaTeX, inline or on its own line', () => {
    const inline = renderMath('\\nu(G) \\le \\lfloor n/2 \\rfloor', false, 'strict');
    expect(inline).toContain('class="katex"');
    expect(inline).not.toContain('katex-display');
    expect(renderMath('M \\oplus E(P)', true, 'strict')).toContain('katex-display');
  });

  it('throws on an invalid formula in strict mode, as the content tests use it', () => {
    expect(() => renderMath('\\frac{1}{', false, 'strict')).toThrow();
    // Strict also refuses what LaTeX itself would not accept, such as accented text in math.
    expect(() => renderMath('é', false, 'strict')).toThrow();
  });

  it('shows an invalid formula in red in the books instead of breaking them', () => {
    const html = renderMath('\\frac{1}{', false);
    expect(html).toContain('katex-error');
    expect(html).toContain('color:#cc0000');
  });
});
