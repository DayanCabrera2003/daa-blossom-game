import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { isUiUnlocked } from '@levels/uiUnlocks';
import { describe, expect, it } from 'vitest';
import { levelTools, offersDone } from './levelTools';
import { TOOL_ACTIONS } from './tools';

const levels = catalog();

const levelById = (id: string): Level => {
  const level = levels.find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The bar of a level of the catalog, with the layers as its id unlocks them. */
const barOf = (id: string) => levelTools(levelById(id), isUiUnlocked('layers', id));

describe('the tools a level shows', () => {
  it('a garden without fog never offers Inspeccionar (3.6), one with fog does (3.1)', () => {
    expect(barOf('3.6')).toEqual(['lanterns', 'marks']);
    expect(barOf('3.1')).toEqual(['lanterns', 'marks', 'inspect']);
  });

  it('scarecrows only where they are presented (3.7, 7.1), stones only where stones are', () => {
    expect(barOf('3.7')).toEqual(['lanterns', 'marks', 'scarecrows']);
    expect(barOf('7.1')).toContain('scarecrows');
    expect(barOf('4.9')).not.toContain('scarecrows');
    expect(barOf('7.2')).toContain('stones');
    expect(barOf('7.2')).not.toContain('scarecrows');
  });

  it('the layers only where flowers can fold; a flower level of chapter 5 keeps them', () => {
    expect(barOf('5.2')).toEqual(['lanterns', 'marks', 'layers']);
    // The recipe of 6.1 folds nothing; the automaton of 6.2 does, and its flowers can be entered.
    expect(barOf('6.1')).toEqual([]);
    expect(barOf('6.2')).toEqual(['layers']);
  });

  it('a level without a play step offers no tool of the garden: nothing there takes a move', () => {
    expect(barOf('2.1')).toEqual([]);
    expect(barOf('4.11')).toEqual([]);
  });

  it('never offers a tool whose every action the level keeps closed', () => {
    for (const level of levels) {
      const allowed = level.start.allowed;
      for (const tool of barOf(level.data.id)) {
        if (tool === 'layers') continue;
        expect(TOOL_ACTIONS[tool].some((action) => allowed.has(action))).toBe(true);
      }
    }
  });

  it('a search without lanterns to move keeps only the marks (4.9)', () => {
    expect(barOf('4.9')).toEqual(['marks']);
  });

  it('offers «Terminé» once learnt, and only where saying it can win (1.8, 3.6; not 1.7, 3.1)', () => {
    expect(offersDone(levelById('1.7'))).toBe(false);
    expect(offersDone(levelById('1.8'))).toBe(true);
    expect(offersDone(levelById('3.1'))).toBe(false);
    expect(offersDone(levelById('3.6'))).toBe(true);
    expect(offersDone(levelById('6.1'))).toBe(false);
  });
});
