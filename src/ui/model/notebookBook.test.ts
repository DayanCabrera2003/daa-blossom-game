import { describe, expect, it } from 'vitest';
import { notebookMove, openNotebook } from './notebookBook';

describe('where the notebook opens', () => {
  it('at the last statement written, the newest', () => {
    expect(openNotebook(3)).toBe(2);
  });

  it('with nothing written, at its empty page', () => {
    expect(openNotebook(0)).toBeNull();
  });
});

describe('turning the pages of the notebook', () => {
  it('the arrows go a statement back or forth, never past either end', () => {
    expect(notebookMove(3, 1, { kind: 'turn', step: 1 })).toBe(2);
    expect(notebookMove(3, 1, { kind: 'turn', step: -1 })).toBe(0);
    expect(notebookMove(3, 2, { kind: 'turn', step: 1 })).toBeNull();
    expect(notebookMove(3, 0, { kind: 'turn', step: -1 })).toBeNull();
  });

  it('Home and End go to the first and the last statement, unless the page is already there', () => {
    expect(notebookMove(3, 1, { kind: 'end', step: -1 })).toBe(0);
    expect(notebookMove(3, 1, { kind: 'end', step: 1 })).toBe(2);
    expect(notebookMove(3, 2, { kind: 'end', step: 1 })).toBeNull();
  });

  it('the keys of the tabs of the Codex do nothing: the notebook has no tabs', () => {
    expect(notebookMove(3, 1, { kind: 'tab', tab: 'formal' })).toBeNull();
  });
});
