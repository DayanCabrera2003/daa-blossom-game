import { unwrap } from '@core/shared/result';
import { actionsUnlockedBy } from '@core/rules/permissions';
import type { Design } from '@levels/sandbox/design';
import { toPlayable } from '@levels/sandbox/toLevel';
import { describe, expect, it } from 'vitest';
import { appendDay } from './appendDay';
import { act, garden, openSession, undoSession } from './levelSession';
import { playDay } from './playedDay';

/** A row A–B–C–D in the dark. */
const ROW: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100 },
    { label: 'B', x: 150, y: 100 },
    { label: 'C', x: 200, y: 100 },
    { label: 'D', x: 250, y: 100 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
  ],
  lanterns: [],
};

const opened = openSession(unwrap(toPlayable(ROW, actionsUnlockedBy('1.8'))), 0).session;

describe('a played day appended to the day of a session', () => {
  it('follows the garden shown, as moves accepted, with the events of each', () => {
    const lit = act(opened, { type: 'join', u: 0, v: 1 }, 0).session;
    const day = playDay(garden(lit), [{ type: 'join', u: 2, v: 3 }], 'a test');
    const after = appendDay(lit, day);
    expect(after.history.states).toEqual([...lit.history.states, day.states[1]]);
    expect(after.history.cursor).toBe(2);
    expect(after.dayEvents).toEqual([...lit.dayEvents, day.events[1]]);
  });

  it('drops what had been undone, as any move after the sun went back does', () => {
    const lit = act(opened, { type: 'join', u: 0, v: 1 }, 0).session;
    const back = undoSession(lit);
    const day = playDay(garden(back), [{ type: 'join', u: 1, v: 2 }], 'a test');
    const after = appendDay(back, day);
    expect(after.history.states).toHaveLength(2);
    expect(after.history.states[1]).toBe(day.states[1]);
    expect(after.dayEvents).toHaveLength(2);
  });

  it('a day of only its dawn changes nothing', () => {
    const after = appendDay(opened, playDay(garden(opened), [], 'a test'));
    expect(after.history).toEqual(opened.history);
    expect(after.dayEvents).toEqual(opened.dayEvents);
  });
});
