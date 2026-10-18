import type { TeacherFeed } from '@services/busEvents';
import { describe, expect, it } from 'vitest';
import {
  FOLDED_PANEL,
  isShown,
  panelKey,
  rowOf,
  withFeed,
  withoutFeed,
  toggled,
  walkTo,
} from './teacherPanel';

const feed = { level: '4.6', day: [], events: [[]], cursor: 0 } as unknown as TeacherFeed;

describe("the teacher's panel, open or folded", () => {
  it('starts folded and without a garden, so a recording starts clean', () => {
    expect(FOLDED_PANEL).toEqual({ open: false, feed: null });
    expect(isShown(FOLDED_PANEL)).toBe(false);
  });

  it('shows only when it is open and a level feeds it', () => {
    expect(isShown(toggled(FOLDED_PANEL))).toBe(false);
    expect(isShown(withFeed(toggled(FOLDED_PANEL), feed))).toBe(true);
    expect(isShown(withFeed(FOLDED_PANEL, feed))).toBe(false);
  });

  it('stays open across levels: leaving hides it, the next level shows it again', () => {
    const open = withFeed(toggled(FOLDED_PANEL), feed);
    const left = withoutFeed(open);
    expect(isShown(left)).toBe(false);
    expect(left.open).toBe(true);
    expect(isShown(withFeed(left, feed))).toBe(true);
  });

  it('toggling twice folds it again', () => {
    expect(toggled(toggled(FOLDED_PANEL))).toEqual(FOLDED_PANEL);
  });
});

describe('walking a trace of the panel', () => {
  it('keeps the step inside the trace', () => {
    expect(walkTo(5, 3)).toBe(3);
    expect(walkTo(-2, 3)).toBe(0);
    expect(walkTo(2, 3)).toBe(2);
  });

  /** Every step from 0 to `last`: a list with no row hidden. */
  const all = (last: number): number[] => Array.from({ length: last + 1 }, (_, k) => k);

  it('the arrows walk one step, Home and End go to the ends, Escape folds', () => {
    expect(panelKey('ArrowDown', 4, all(10))).toEqual({ kind: 'step', step: 5 });
    expect(panelKey('ArrowRight', 4, all(10))).toEqual({ kind: 'step', step: 5 });
    expect(panelKey('ArrowUp', 4, all(10))).toEqual({ kind: 'step', step: 3 });
    expect(panelKey('ArrowLeft', 0, all(10))).toEqual({ kind: 'step', step: 0 });
    expect(panelKey('ArrowDown', 10, all(10))).toEqual({ kind: 'step', step: 10 });
    expect(panelKey('Home', 4, all(10))).toEqual({ kind: 'step', step: 0 });
    expect(panelKey('End', 4, all(10))).toEqual({ kind: 'step', step: 10 });
    expect(panelKey('Escape', 4, all(10))).toEqual({ kind: 'fold' });
    expect(panelKey('t', 4, all(10))).toBeNull();
  });

  it('with rows hidden, the arrows walk from row to row, skipping the hidden steps', () => {
    const rows = [0, 1, 4, 7, 9];
    expect(panelKey('ArrowDown', 1, rows)).toEqual({ kind: 'step', step: 4 });
    expect(panelKey('ArrowUp', 7, rows)).toEqual({ kind: 'step', step: 4 });
    // From a hidden step (the run's sun left there), to the rows round it.
    expect(panelKey('ArrowDown', 5, rows)).toEqual({ kind: 'step', step: 7 });
    expect(panelKey('ArrowUp', 5, rows)).toEqual({ kind: 'step', step: 4 });
    expect(panelKey('End', 2, rows)).toEqual({ kind: 'step', step: 9 });
    expect(panelKey('Home', 2, rows)).toEqual({ kind: 'step', step: 0 });
  });

  it('marks a hidden step on the last row before it', () => {
    const rows = [0, 1, 4, 7, 9];
    expect(rowOf(rows, 4)).toBe(4);
    expect(rowOf(rows, 5)).toBe(4);
    expect(rowOf(rows, 12)).toBe(9);
    expect(rowOf(rows, 0)).toBe(0);
  });
});
