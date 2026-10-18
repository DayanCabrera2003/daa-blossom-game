import type { TeacherFeed } from '@services/busEvents';
import { describe, expect, it } from 'vitest';
import {
  FOLDED_PANEL,
  isShown,
  panelKey,
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

  it('the arrows walk one step, Home and End go to the ends, Escape folds', () => {
    expect(panelKey('ArrowDown', 4, 10)).toEqual({ kind: 'step', step: 5 });
    expect(panelKey('ArrowRight', 4, 10)).toEqual({ kind: 'step', step: 5 });
    expect(panelKey('ArrowUp', 4, 10)).toEqual({ kind: 'step', step: 3 });
    expect(panelKey('ArrowLeft', 0, 10)).toEqual({ kind: 'step', step: 0 });
    expect(panelKey('Home', 4, 10)).toEqual({ kind: 'step', step: 0 });
    expect(panelKey('End', 4, 10)).toEqual({ kind: 'step', step: 10 });
    expect(panelKey('Escape', 4, 10)).toEqual({ kind: 'fold' });
    expect(panelKey('t', 4, 10)).toBeNull();
  });
});
