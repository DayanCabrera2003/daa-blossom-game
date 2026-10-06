import { applyAction } from '@core/rules/applyAction';
import { isVictory } from '@core/rules/victory';
import { gesturesFor, perform } from '@game/input/gestures';
import { initialPointer } from '@game/input/pointer';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * Every level can be won with the interface: its reference solution, turned into touches and drags
 * on the canvas (where its sprouts really are) and fed through the pointer the level scene uses,
 * produces moves the rules accept and that leave the garden exactly as the solution does.
 */
describe.each(catalog().map((level) => [level.data.id, level] as const))('level %s', (_, level) => {
  it('is won by playing its solution with gestures', () => {
    const positions = level.data.sprouts.map(({ x, y }) => ({ x, y }));
    let state = level.start;
    let pointer = initialPointer('lanterns');
    for (const action of level.solution) {
      const expected = applyAction(state, action);
      if (!expected.ok) throw new Error(`the solution itself is refused: ${expected.reason.code}`);
      const performed = perform(state, positions, pointer, gesturesFor(state, positions, action));
      pointer = performed.pointer;
      expect(performed.actions).toHaveLength(1);
      const [produced] = performed.actions;
      if (produced === undefined) return;
      const outcome = applyAction(state, produced);
      expect(outcome.ok && outcome.state).toEqual(expected.state);
      if (!outcome.ok) return;
      state = outcome.state;
    }
    expect(isVictory(state, level.data.victory)).toBe(true);
  });
});
