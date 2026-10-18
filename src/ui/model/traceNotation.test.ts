import notation from '@content/es/notation.json';
import type { TraceEvent } from '@core/trace/events';
import { describe, expect, it } from 'vitest';
import { NOTATION_KEYS } from './notationKeys';
import { eventTex, fillNotation, traceLines } from './traceNotation';

const names = ['R', 'a', 'b', 'c', 'd1'];

/** The TeX of one event in the garden of `names`, with the Spanish templates. */
const tex = (event: TraceEvent): string => eventTex(event, names, notation);

describe('the templates of the notation', () => {
  it('has exactly the templates the events and the certificate use, with their gaps', () => {
    expect(Object.keys(notation).sort()).toEqual(Object.keys(NOTATION_KEYS).sort());
    for (const [key, gaps] of Object.entries(NOTATION_KEYS)) {
      const template = (notation as Record<string, string>)[key] ?? '';
      for (const gap of gaps) expect(template, `${key} fills {${gap}}`).toContain(`{${gap}}`);
    }
  });

  it('fills only the gaps it is given, leaving the groups of TeX alone', () => {
    expect(fillNotation({ k: 'B_{i}\\text{x}={v}' }, 'k', { v: 'a' })).toBe('B_{i}\\text{x}=a');
  });

  it('shows a missing template as its key in text, never as broken TeX', () => {
    expect(fillNotation({}, 'nowhere', {})).toBe('\\text{‹nowhere›}');
  });
});

describe('each event in the notation of the Codex', () => {
  it('a search opens the whole garden and roots the forest at the exposed vertices', () => {
    expect(tex({ type: 'searchStart', roots: [0, 4] })).toBe(
      "\\text{Fase: }G'\\leftarrow G,\\ M'\\leftarrow M,\\ R=\\{R,d_{1}\\},\\ O\\leftarrow R,\\ I\\leftarrow\\emptyset",
    );
    expect(tex({ type: 'searchStart', roots: [] })).toContain('R=\\emptyset');
  });

  it('labels name the root, the parent and the set: O for suns, I for moons', () => {
    expect(tex({ type: 'labelOuter', vertex: 0, parent: null, root: 0 })).toBe('R\\in O,\\ r(R)=R');
    expect(tex({ type: 'labelOuter', vertex: 2, parent: 1, root: 0 })).toBe(
      'b\\in O,\\ p(b)=a,\\ r(b)=R',
    );
    expect(tex({ type: 'labelInner', vertex: 1, parent: 0, root: 0 })).toBe(
      'a\\in I,\\ p(a)=R,\\ r(a)=R',
    );
  });

  it('an examination and an odd cycle name the edge', () => {
    expect(tex({ type: 'scanEdge', from: 0, to: 1 })).toBe('\\text{se examina }Ra');
    expect(tex({ type: 'oddCycleFound', vine: [2, 3] })).toContain('bc\\text{');
  });

  it('a contraction writes the blossom B_i as its closed cycle from the base, and G/B', () => {
    expect(
      tex({
        type: 'contract',
        blossom: 1,
        base: 1,
        cycle: [
          { kind: 'sprout', vertex: 1 },
          { kind: 'sprout', vertex: 2 },
          { kind: 'blossom', id: 0 },
        ],
      }),
    ).toBe(
      "B_{1}=a\\,b\\,B_{0}\\,a,\\ \\beta(B_{1})=a,\\ G'\\leftarrow G'/B_{1},\\ M'\\leftarrow M'/B_{1}",
    );
    expect(tex({ type: 'expand', blossom: 3 })).toBe('\\text{se despliega }B_{3}');
  });

  it('an augmentation and the end use M ⊕ E(P) and ν(G)', () => {
    expect(tex({ type: 'augment', path: [0, 1, 2, 4] })).toBe(
      'P=R\\,a\\,b\\,d_{1},\\ M\\leftarrow M\\oplus E(P)',
    );
    expect(tex({ type: 'searchFailed' })).toContain('Q=\\emptyset');
    expect(tex({ type: 'done', size: 2 })).toBe('\\lvert M\\rvert=2=\\nu(G)');
  });

  it("the player's moves: lanterns, the fog, chains, marks wiped, scarecrows, stones", () => {
    expect(tex({ type: 'light', u: 0, v: 1 })).toBe('M\\leftarrow M\\cup\\{Ra\\}');
    expect(tex({ type: 'putOut', u: 0, v: 1 })).toBe('M\\leftarrow M\\setminus\\{Ra\\}');
    expect(tex({ type: 'inspect', vertex: 3, vines: [2, 4] })).toBe(
      '\\Gamma(\\{c\\})=\\{b,d_{1}\\}',
    );
    expect(tex({ type: 'inspect', vertex: 3, vines: [] })).toBe('\\Gamma(\\{c\\})=\\emptyset');
    expect(tex({ type: 'chainFound', path: [0, 1] })).toContain('P=R\\,a');
    expect(tex({ type: 'searchCleared' })).toBe('O\\leftarrow\\emptyset,\\ I\\leftarrow\\emptyset');
    expect(tex({ type: 'scarecrow', vertex: 2, placed: true })).toBe('C\\leftarrow C\\cup\\{b\\}');
    expect(tex({ type: 'scarecrow', vertex: 2, placed: false })).toBe(
      'C\\leftarrow C\\setminus\\{b\\}',
    );
    expect(tex({ type: 'stone', vertex: 3, lifted: true })).toBe('U\\leftarrow U\\cup\\{c\\}');
    expect(tex({ type: 'stone', vertex: 3, lifted: false })).toBe(
      'U\\leftarrow U\\setminus\\{c\\}',
    );
    expect(tex({ type: 'declareDone' })).toContain('\\nu(G)');
  });
});

describe('a trace as numbered lines', () => {
  it('numbers each event by the moment after it, as the sun counts them', () => {
    const lines = traceLines(
      [
        { type: 'searchStart', roots: [0] },
        { type: 'labelOuter', vertex: 0, parent: null, root: 0 },
      ],
      names,
      notation,
    );
    expect(lines.map(({ step, type }) => [step, type])).toEqual([
      [1, 'searchStart'],
      [2, 'labelOuter'],
    ]);
    expect(lines[1]?.tex).toBe('R\\in O,\\ r(R)=R');
  });
});
