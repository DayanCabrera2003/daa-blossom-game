import { EMPTY_DESIGN, type Design } from '@levels/sandbox/design';
import { describe, expect, it } from 'vitest';
import { amendDesign, recordDesign } from './designHistory';
import { canRedo, canUndo, current, redo, startHistory, undo } from './history';

/** A design with one sprout at x. */
const one = (x: number): Design => ({ ...EMPTY_DESIGN, sprouts: [{ label: 'A', x, y: 100 }] });

describe('the history of the designs of the editor', () => {
  it('records each new design after the one shown; undo and redo walk it', () => {
    const history = recordDesign(recordDesign(startHistory(EMPTY_DESIGN), one(50)), one(80));
    expect(current(history)).toEqual(one(80));
    expect(current(undo(history))).toEqual(one(50));
    expect(current(redo(undo(history)))).toEqual(one(80));
  });

  it('an edit that leaves the design as it was records nothing to undo', () => {
    const start = startHistory(EMPTY_DESIGN);
    expect(recordDesign(start, EMPTY_DESIGN)).toBe(start);
    expect(canUndo(recordDesign(start, EMPTY_DESIGN))).toBe(false);
  });

  it('amending replaces the design shown, so undo goes back past it in one step', () => {
    // The generate menu: the first garden grown is recorded, each change of size amends it.
    const grown = recordDesign(startHistory(EMPTY_DESIGN), one(50));
    const resized = amendDesign(amendDesign(grown, one(60)), one(70));
    expect(current(resized)).toEqual(one(70));
    expect(resized.states).toHaveLength(2);
    expect(current(undo(resized))).toEqual(EMPTY_DESIGN);
  });

  it('amending drops what had been undone, as any change does', () => {
    const undone = undo(recordDesign(startHistory(EMPTY_DESIGN), one(50)));
    const amended = amendDesign(undone, one(90));
    expect(current(amended)).toEqual(one(90));
    expect(canRedo(amended)).toBe(false);
    expect(canUndo(amended)).toBe(false);
  });
});
