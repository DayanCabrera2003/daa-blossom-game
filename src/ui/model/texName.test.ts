import { describe, expect, it } from 'vitest';
import { flowerName, texEdge, texName, texPath, texSet } from './texName';

describe('the names of sprouts and flowers in TeX', () => {
  it('writes a one-letter name or a number as it is, in the italic of the Codex', () => {
    expect(texName('R')).toBe('R');
    expect(texName('a')).toBe('a');
    expect(texName('5')).toBe('5');
  });

  it('writes a letter followed by digits with the digits as its index', () => {
    expect(texName('a1')).toBe('a_{1}');
    expect(texName('R12')).toBe('R_{12}');
  });

  it('writes any other name upright as text, every special character escaped', () => {
    expect(texName('Ana')).toBe('\\text{Ana}');
    expect(texName('x_y')).toBe('\\text{x\\_y}');
    expect(texName('#1')).toBe('\\text{\\#1}');
    expect(texName('a\\b{c}^d%e&f$g~h')).toBe(
      '\\text{a\\textbackslash{}b\\{c\\}\\textasciicircum{}d\\%e\\&f\\$g\\textasciitilde{}h}',
    );
    expect(texName('ñu')).toBe('\\text{ñu}');
    expect(texName('')).toBe('\\text{}');
  });

  it('names the flower folded with id i as B_i, as the contractions of the Codex do', () => {
    expect(flowerName(0)).toBe('B_{0}');
    expect(flowerName(12)).toBe('B_{12}');
  });

  it('writes vines, paths and sets of named sprouts', () => {
    const names = ['R', 'a1', 'Ana'];
    expect(texEdge(names, 0, 1)).toBe('Ra_{1}');
    expect(texPath(names, [0, 1, 2])).toBe('R\\,a_{1}\\,\\text{Ana}');
    expect(texSet(names, [2, 0])).toBe('\\{\\text{Ana},R\\}');
    expect(texSet(names, [])).toBe('\\emptyset');
  });

  it('names a sprout with no name by its id, so nothing is ever left blank', () => {
    expect(texEdge([], 3, 4)).toBe('34');
  });
});
