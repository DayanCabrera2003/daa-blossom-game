import type { Action } from '@core/rules/actions';
import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { act, startSession, stepNow } from './levelSession';

/** A row A–B–C whose play step, won with one lantern, waits for a second one to be refused. */
const row = (): Level => {
  const loaded = loadLevel({
    id: '0.2',
    sprouts: [
      { label: 'A', x: 160, y: 135 },
      { label: 'B', x: 240, y: 135 },
      { label: 'C', x: 320, y: 135 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
    ],
    goal: { visible: true, value: 1 },
    victory: { type: 'matchingSize', value: 1 },
    flow: [
      { step: 'play', until: { refused: 'alreadyLit' } },
      { step: 'say', lines: ['ch0.2.sauce.00'] },
    ],
    solution: [{ type: 'join', u: 'A', v: 'B' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};
const first: Action = { type: 'join', u: 0, v: 1 };
const second: Action = { type: 'join', u: 1, v: 2 };

describe('a play step that waits for a refused move (0.2)', () => {
  it('the first lantern alone, or another refusal, does not end the step', () => {
    const lit = act(startSession(row(), 0), first, 0);
    expect(lit.effects).toEqual([]);
    expect(stepNow(lit.session)?.step).toBe('play');
    const apart = act(lit.session, { type: 'join', u: 0, v: 2 }, 0);
    expect(apart.outcome).toMatchObject({ ok: false, reason: { code: 'notAdjacent' } });
    expect(stepNow(apart.session)?.step).toBe('play');
  });

  it('a second lantern refused with the victory holding ends it, still counted as a refusal', () => {
    const lit = act(startSession(row(), 0), first, 0).session;
    const tried = act(lit, second, 0);
    expect(tried.outcome).toMatchObject({ ok: false, reason: { code: 'alreadyLit' } });
    expect(tried.effects).toEqual([
      { kind: 'say', lines: ['ch0.2.sauce.00'] },
      { kind: 'finished' },
    ]);
    expect(tried.session.rejections).toBe(1);
    expect(tried.session.won).not.toBeNull();
  });
});
