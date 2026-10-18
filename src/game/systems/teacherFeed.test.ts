import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { act, openSession, seekSession } from './levelSession';
import { teacherFeed } from './teacherFeed';

const level = catalog().find((each) => each.data.id === '1.3');
if (level === undefined) throw new Error('the catalog has 1.3');

describe("the teacher's feed of a level", () => {
  it('outside teacher mode there is none', () => {
    expect(teacherFeed(openSession(level, 0).session, false)).toBeNull();
  });

  it('after a chain in 1.3 it carries the new lanterns and the augmentation', () => {
    const [chain] = level.solution;
    if (chain === undefined) throw new Error('1.3 has a chain to play');
    const played = act(openSession(level, 0).session, chain, 0).session;
    const feed = teacherFeed(played, true);
    expect(feed?.level).toBe('1.3');
    expect(feed?.cursor).toBe(1);
    expect(feed?.day).toBe(played.history.states);
    expect(feed?.day[1]?.matching).not.toEqual(level.start.matching);
    expect(feed?.events[1]).toContainEqual({ type: 'augment', path: [0, 1, 2, 3, 4, 5] });
  });

  it('follows the sun: dragged back to dawn, the feed says so and keeps the day', () => {
    const [chain] = level.solution;
    if (chain === undefined) throw new Error('1.3 has a chain to play');
    const played = act(openSession(level, 0).session, chain, 0).session;
    const dawn = teacherFeed(seekSession(played, 0), true);
    expect(dawn?.cursor).toBe(0);
    expect(dawn?.day).toHaveLength(2);
  });
});
