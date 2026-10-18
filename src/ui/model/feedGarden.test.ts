import notation from '@content/es/notation.json';
import { applyAction } from '@core/rules/applyAction';
import { unwrap } from '@core/shared/result';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import type { TeacherFeed } from '@services/busEvents';
import { describe, expect, it } from 'vitest';
import { feedGarden } from './feedGarden';
import { teacherTrace } from './teacherTrace';

const levels = new Map(catalog().map((level) => [level.data.id, level]));
const levelOf = (id: string): Level | undefined => levels.get(id);

/**
 * A garden of the free mode as the editor hands it to the level: chapter 9, which the catalog does
 * not have, a row W–X–Y–Z with X=Y lit, and one bee and one flower to show they travel too.
 */
const FREE = unwrap(
  loadLevel({
    id: '9.1',
    draft: true,
    sprouts: [
      { label: 'W', x: 100, y: 120, kind: 'bee' },
      { label: 'X', x: 160, y: 120, kind: 'flower' },
      { label: 'Y', x: 220, y: 120, kind: 'bee' },
      { label: 'Z', x: 280, y: 120, kind: 'flower' },
    ],
    vines: [
      ['W', 'X'],
      ['X', 'Y'],
      ['Y', 'Z'],
    ],
    lanterns: [['X', 'Y']],
    goal: { visible: false },
    victory: { type: 'maximum' },
    flow: [{ step: 'play' }],
    solution: [{ type: 'chain', path: ['W', 'X', 'Y', 'Z'] }, { type: 'declareDone' }],
  }),
);

/** The feed of the free garden after its chain, with its sprouts or, to compare, without. */
function freeFeed(withSprouts: boolean): TeacherFeed {
  const chain = FREE.solution[0];
  if (chain === undefined) throw new Error('the free garden has a chain');
  const played = applyAction(FREE.start, chain);
  if (!played.ok) throw new Error('the chain is accepted');
  const feed: TeacherFeed = {
    level: FREE.data.id,
    day: [FREE.start, played.state],
    events: [[], played.events],
    cursor: 1,
  };
  return withSprouts ? { ...feed, sprouts: FREE.data.sprouts } : feed;
}

describe("the garden the teacher's panel draws for a feed", () => {
  it('for a level of the catalog, is that level as it starts, names and places from its file', () => {
    const level = levelOf('1.3');
    if (level === undefined) throw new Error('the catalog has 1.3');
    const garden = feedGarden(
      { level: '1.3', day: [level.start], events: [[]], cursor: 0 },
      levelOf,
    );
    expect(garden?.names).toEqual(level.data.sprouts.map((sprout) => sprout.label));
    expect(garden?.positions).toEqual(level.data.sprouts.map(({ x, y }) => ({ x, y })));
    expect(garden?.level).toBe(level);
  });

  it('for a garden of the free mode, takes the names, places and kinds the feed brings', () => {
    const garden = feedGarden(freeFeed(true), levelOf);
    expect(garden?.names).toEqual(['W', 'X', 'Y', 'Z']);
    expect(garden?.positions).toEqual([
      { x: 100, y: 120 },
      { x: 160, y: 120 },
      { x: 220, y: 120 },
      { x: 280, y: 120 },
    ]);
    expect(garden?.kinds).toEqual(['bee', 'flower', 'bee', 'flower']);
    expect(garden?.start).toBe(FREE.start);
    expect(garden?.level).toBeNull();
  });

  it('has none for a level the catalog lacks when the feed brings no sprouts', () => {
    expect(feedGarden(freeFeed(false), levelOf)).toBeNull();
  });

  it("writes the free garden's day with its own names", () => {
    const feed = freeFeed(true);
    const garden = feedGarden(feed, levelOf);
    if (garden === null) throw new Error('the free garden is drawn');
    const trace = teacherTrace(feed, garden.names, notation);
    const day = trace.day.flatMap((step) => step.lines).join(' ');
    for (const name of ['W', 'X', 'Y', 'Z']) expect(day).toContain(name);
  });
});
