import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { chainPreview, previewModeOf } from './previewMode';

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/**
 * The garden of a level just before its reference solution lights its last chain, and that chain:
 * a legal chain of +1, dragged where the level is really played.
 */
function beforeLastChain(level: Level): { state: GardenState; path: readonly number[] } {
  const last = level.solution.map((action) => action.type).lastIndexOf('chain');
  const chain = level.solution[last] as Extract<Action, { type: 'chain' }>;
  const state = level.solution.slice(0, last).reduce((garden, action) => {
    const outcome = applyAction(garden, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, level.start);
  return { state, path: chain.path };
}

describe('what the dragged chain tells (GDD §5.1, Cadena)', () => {
  it('tells its gain in chapters 0–2 and only whether it is legal from chapter 3 on', () => {
    expect(['0.5', '1.3', '1.10', '2.4'].map(previewModeOf)).toEqual([
      'gain',
      'gain',
      'gain',
      'gain',
    ]);
    expect(['3.1', '3.10', '4.5', '5.6', '7.6'].map(previewModeOf)).toEqual([
      'legality',
      'legality',
      'legality',
      'legality',
      'legality',
    ]);
  });

  it('in 1.3 a legal chain says +1; in 3.1 and 4.5 it says only that it is legal', () => {
    const preview = (id: string) => {
      const { state, path } = beforeLastChain(levelById(id));
      return chainPreview(state, path, previewModeOf(id));
    };
    expect(preview('1.3')).toBe('gain1');
    expect(preview('3.1')).toBe('legal');
    expect(preview('4.5')).toBe('legal');
  });

  it('a chain of gain 0 is grey only where the gain is told', () => {
    const { start } = levelById('1.3');
    // In 1.3, S–A=B ends on B's lantern: a legal chain that gains nothing.
    expect(chainPreview(start, [0, 1, 2], 'gain')).toBe('gain0');
    expect(chainPreview(start, [0, 1, 2], 'legality')).toBe('legal');
  });

  it('a chain that is not legal says so in both modes', () => {
    const { start } = levelById('1.3');
    expect(chainPreview(start, [0, 2], 'gain')).toBe('illegal');
    expect(chainPreview(start, [0, 2], 'legality')).toBe('illegal');
  });
});
