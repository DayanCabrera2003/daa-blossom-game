import { cycleGraph } from '@core/generators/families';
import { createGardenState } from '@core/rules/state';
import { applyAction } from '@core/rules/applyAction';
import { actionsUnlockedBy } from '@core/rules/permissions';
import { describe, expect, it } from 'vitest';
import { lentDay } from './lentDay';

// A loop of five sprouts, 0…4, all in the dark, played with the actions of 1.8: no marks yet.
const start = createGardenState({ graph: cycleGraph(5), allowed: actionsUnlockedBy('1.8') });

describe('a day played with tools lent for it', () => {
  it('plays moves the garden does not allow, with the tools lent', () => {
    expect(applyAction(start, { type: 'markRoot', vertex: 0 }).ok).toBe(false);
    const day = lentDay(start, [{ type: 'markRoot', vertex: 0 }], ['markRoot'], 'a test');
    expect(day.states).toHaveLength(2);
    expect(day.states[1]?.search?.label[0]).toBe('outer');
    expect(day.events[0]).toEqual([]);
    expect(day.events[1]?.length).toBeGreaterThan(0);
  });

  it("gives every garden of the day back with the player's own tools, roots and fog", () => {
    const fogged = { ...start, roots: [1], revealed: [false, false, false, false, false] };
    const day = lentDay(fogged, [{ type: 'markRoot', vertex: 0 }], ['markRoot'], 'a test');
    expect(day.states[0]).toBe(fogged);
    for (const state of day.states) {
      expect(state.allowed).toBe(fogged.allowed);
      expect(state.roots).toBe(fogged.roots);
      expect(state.revealed).toBe(fogged.revealed);
    }
  });

  it('a move refused even with the tools lent is a broken plan', () => {
    expect(() => lentDay(start, [{ type: 'unfold', blossom: 7 }], ['unfold'], 'a test')).toThrow(
      /a test/,
    );
  });
});
