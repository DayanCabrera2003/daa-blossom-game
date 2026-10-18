import { describe, expect, it } from 'vitest';
import type { TraceEvent } from '@core/trace/events';
import { stateAt } from '@core/trace/replay';
import { applyAction } from '@core/rules/applyAction';
import { catalog } from '@levels/catalog';
import { demoStart } from '@levels/demoStart';
import { snapshotOf } from './gardenSnapshot';

describe('snapshotOf', () => {
  it('shows a garden in the dark, unmarked and open, at the start of a level', () => {
    const level = catalog().find((one) => one.data.id === '1.1');
    const start = level?.start;
    if (start === undefined) throw new Error('no level 1.1');
    expect(snapshotOf(start)).toEqual({
      mate: [-1, -1, -1, -1],
      label: ['none', 'none', 'none', 'none'],
      flowers: [],
    });
  });

  // A chain of the player opens every flower without an `expand` event, which the replay of the
  // events does not see; so after a chain only the lanterns and the marks are compared.
  it('agrees with replaying the events of the rules, after every move of every solution', () => {
    let compared = 0;
    let folded = 0;
    for (const level of catalog()) {
      let state = demoStart(level.start);
      const events: TraceEvent[] = [];
      for (const move of level.solution) {
        const outcome = applyAction(state, move);
        if (!outcome.ok) break;
        state = outcome.state;
        events.push(...outcome.events);
        const replayed = stateAt(level.start.matching, events, events.length);
        const chained = events.some((event) => event.type === 'augment');
        const { flowers, ...rest } = snapshotOf(state);
        expect({ level: level.data.id, ...rest }).toEqual({
          level: level.data.id,
          mate: replayed.mate,
          label: replayed.label,
        });
        if (!chained) expect(flowers).toEqual(replayed.flowers);
        compared++;
        if (flowers.length > 0) folded++;
      }
    }
    expect(compared).toBeGreaterThan(100);
    expect(folded).toBeGreaterThan(5);
  });
});
