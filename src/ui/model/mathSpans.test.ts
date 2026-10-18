import { describe, expect, it } from 'vitest';
import { matchMath, mathSpans, type MathSpan } from './mathSpans';

/** Shorthands for the expected spans. */
const text = (value: string): MathSpan => ({ kind: 'text', text: value });
const inline = (tex: string): MathSpan => ({ kind: 'math', tex, display: false });
const display = (tex: string): MathSpan => ({ kind: 'math', tex, display: true });

describe('matchMath', () => {
  it('reads inline math at the very start of the text', () => {
    expect(matchMath('$x^2$ and more')).toEqual({ raw: '$x^2$', tex: 'x^2', display: false });
  });

  it('reads display math, across lines, without the blank around it', () => {
    expect(matchMath('$$\n\\nu(G)\n$$\nafter')).toEqual({
      raw: '$$\n\\nu(G)\n$$',
      tex: '\\nu(G)',
      display: true,
    });
  });

  it('finds nothing when the text does not start with a dollar', () => {
    expect(matchMath('x $y$')).toBeNull();
  });

  it('skips escaped dollars and escaped backslashes inside the formula', () => {
    expect(matchMath('$a \\$ b$')).toEqual({ raw: '$a \\$ b$', tex: 'a \\$ b', display: false });
    expect(matchMath('$a\\\\$ b')).toEqual({ raw: '$a\\\\$', tex: 'a\\\\', display: false });
    expect(matchMath('$$a \\$$ b$$')).toEqual({
      raw: '$$a \\$$ b$$',
      tex: 'a \\$$ b',
      display: true,
    });
  });

  it('reads no formula from prices, spaced dollars or empty pairs', () => {
    expect(matchMath('$5 and $6')).toBeNull();
    expect(matchMath('$ x$')).toBeNull();
    expect(matchMath('$x $')).toBeNull();
    expect(matchMath('$x$5')).toBeNull();
    expect(matchMath('$$')).toBeNull();
    expect(matchMath('$$  $$')).toBeNull();
    expect(matchMath('$')).toBeNull();
  });

  it('reads no formula left open, nor one that runs across a blank line', () => {
    expect(matchMath('$x')).toBeNull();
    expect(matchMath('$$x')).toBeNull();
    expect(matchMath('$x\n\ny$')).toBeNull();
    expect(matchMath('$x\n  \ny$')).toBeNull();
    expect(matchMath('$x\ny$')).toEqual({ raw: '$x\ny$', tex: 'x\ny', display: false });
  });
});

describe('mathSpans', () => {
  it('splits a text into its words and its formulas', () => {
    expect(mathSpans('a $x$ b $$y$$')).toEqual([
      text('a '),
      inline('x'),
      text(' b '),
      display('y'),
    ]);
  });

  it('keeps escaped dollars as text', () => {
    expect(mathSpans('costs \\$5 or \\$6')).toEqual([text('costs \\$5 or \\$6')]);
  });

  it('keeps a lone or unclosed dollar as text', () => {
    expect(mathSpans('$5 and $6, then $x$')).toEqual([text('$5 and $6, then '), inline('x')]);
  });

  it('ignores dollars inside code spans', () => {
    expect(mathSpans('see `$x$` and ``a ` $y$`` then $z$')).toEqual([
      text('see `$x$` and ``a ` $y$`` then '),
      inline('z'),
    ]);
  });

  it('keeps an unmatched run of backticks as text and goes on', () => {
    expect(mathSpans('a ``b` $x$')).toEqual([text('a ``b` '), inline('x')]);
  });

  it('ignores dollars inside fenced code blocks, closed or not', () => {
    const fenced = '$a$\n```diagram\n{ "tex": "$b$" }\n```\n$c$';
    expect(mathSpans(fenced)).toEqual([
      inline('a'),
      text('\n```diagram\n{ "tex": "$b$" }\n```\n'),
      inline('c'),
    ]);
    expect(mathSpans('~~~~\n$a$\n~~~\n$b$')).toEqual([text('~~~~\n$a$\n~~~\n$b$')]);
  });

  it('closes a fence only with a line of the same mark, at least as long', () => {
    expect(mathSpans('````\n```\n$a$\n````\n$b$')).toEqual([
      text('````\n```\n$a$\n````\n'),
      inline('b'),
    ]);
  });

  it('gives nothing for an empty text', () => {
    expect(mathSpans('')).toEqual([]);
  });
});
