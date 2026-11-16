import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { startingTool } from './startingTool';
import { toolOf } from './tools';

const levels = catalog();

const levelById = (id: string): Level => {
  const level = levels.find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

describe('the tool a level starts with', () => {
  it('is the tool of the first move of its solution', () => {
    expect(startingTool(levelById('1.1'))).toBe('lanterns');
    expect(startingTool(levelById('3.1'))).toBe('inspect');
    expect(startingTool(levelById('3.7'))).toBe('scarecrows');
    expect(startingTool(levelById('3.8'))).toBe('marks');
  });

  it('where the light searches by itself, the first tool of the bar (4.4, 4.5)', () => {
    expect(startingTool(levelById('4.4'))).toBe('marks');
    expect(startingTool(levelById('4.5'))).toBe('lanterns');
  });

  it('with no move to make, the first tool of the bar, never the layers (7.2, 6.2)', () => {
    expect(startingTool(levelById('7.2'))).toBe('lanterns');
    expect(startingTool(levelById('6.2'))).toBe('lanterns');
  });

  it('every level outside the light starts with the tool its first move needs', () => {
    for (const level of levels) {
      if (level.start.allowed.has('stepLight')) continue;
      const first = level.solution.map((move) => toolOf(move.type)).find((tool) => tool !== null);
      if (first !== undefined && first !== null) {
        expect(startingTool(level), level.data.id).toBe(first);
      }
    }
  });
});
