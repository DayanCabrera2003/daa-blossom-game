import type { ActionType } from '@core/rules/actions';
import { actionsUnlockedBy, UNLOCKED_AT } from '@core/rules/permissions';
import { describe, expect, it } from 'vitest';
import { availableTools, TOOL_ACTIONS } from './tools';

const allowed = (levelId: string) => new Set(actionsUnlockedBy(levelId));

describe('tools of the gardener', () => {
  it('the prologue only has lanterns', () => {
    expect(availableTools(allowed('0.1'))).toEqual(['lanterns']);
  });

  it('the greenhouse adds marks and the fog; scarecrows arrive in 3.7', () => {
    expect(availableTools(allowed('3.1'))).toEqual(['lanterns', 'marks', 'inspect']);
    expect(availableTools(allowed('3.7'))).toEqual(['lanterns', 'marks', 'inspect', 'scarecrows']);
  });

  it('by the Council every tool is at hand', () => {
    expect(availableTools(allowed('7.2'))).toEqual([
      'lanterns',
      'marks',
      'foldLoop',
      'inspect',
      'scarecrows',
      'stones',
    ]);
  });

  it('a level that closes folding keeps the marks tool for its other actions (4.10)', () => {
    const noFolding = new Set<ActionType>(['join', 'markRoot', 'markMoon', 'unfold']);
    expect(availableTools(noFolding)).toEqual(['lanterns', 'marks']);
  });

  it('the layers tool joins the toolbar from 5.2, last; it makes no move of its own', () => {
    expect(availableTools(allowed('5.1'))).not.toContain('layers');
    expect(availableTools(allowed('5.2'), true)).toEqual([
      'lanterns',
      'marks',
      'foldLoop',
      'inspect',
      'scarecrows',
      'layers',
    ]);
    expect(TOOL_ACTIONS.layers).toEqual([]);
  });

  it('every action except "Terminé" belongs to exactly one tool', () => {
    const grouped = Object.values(TOOL_ACTIONS).flat();
    const everyAction = (Object.keys(UNLOCKED_AT) as ActionType[]).filter(
      (a) => a !== 'declareDone',
    );
    expect([...grouped].sort()).toEqual([...everyAction].sort());
  });
});
