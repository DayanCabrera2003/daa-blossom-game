import { describe, expect, it } from 'vitest';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import type { DiagramMove } from './diagramSpec';
import type { DiagramTarget } from './diagramTouch';
import {
  currentGarden,
  lanternCount,
  passChain,
  resetPlay,
  startPlay,
  touchPlay,
  undoPlay,
  type PlaySession,
} from './diagramPlay';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));
const sprout = (vertex: number): DiagramTarget => ({ kind: 'sprout', vertex });

/** Touches the sprouts one after another. */
const touchAll = (session: PlaySession, sprouts: readonly number[]): PlaySession =>
  sprouts.reduce((now, vertex) => touchPlay(now, sprout(vertex)), session);

describe('a garden to play in the Codex: C1 on the garden of 1.1', () => {
  const moves: readonly DiagramMove[] = ['join', 'split'];
  const garden = gardenOf('1.1');

  it('starts in the dark, with only the moves of the block allowed', () => {
    const session = startPlay(garden, moves);
    expect(lanternCount(session)).toBe(0);
    expect([...currentGarden(session).allowed]).toEqual(['join', 'split']);
    expect(session.refusal).toBeNull();
  });

  it('joining B and C lights one lantern, and then the rules accept only putting it out', () => {
    const joined = touchAll(startPlay(garden, moves), [1, 2]);
    expect(lanternCount(joined)).toBe(1);
    const targets: DiagramTarget[] = [
      ...[0, 1, 2, 3].map(sprout),
      ...garden.start.graph.edges.map(([u, v]) => ({ kind: 'vine' as const, u, v })),
    ];
    const accepted: string[] = [];
    for (const first of targets) {
      for (const second of targets) {
        const after = touchPlay(touchPlay(joined, first), second);
        if (after.history.length > joined.history.length) {
          accepted.push(JSON.stringify(currentGarden(after).matching.mate));
        }
      }
    }
    // The only move accepted, whatever two touches follow, puts the lantern of B–C out.
    expect(new Set(accepted)).toEqual(new Set([JSON.stringify([-1, -1, -1, -1])]));
  });

  it('joining A–B and C–D lights two', () => {
    expect(lanternCount(touchAll(startPlay(garden, moves), [0, 1, 2, 3]))).toBe(2);
  });

  it('a refused touch says why, with the move, and changes nothing', () => {
    const tried = touchAll(startPlay(garden, moves), [0, 3]);
    expect(tried.history).toHaveLength(1);
    expect(tried.refusal).toEqual({
      reason: { code: 'notAdjacent', u: 0, v: 3 },
      action: { type: 'join', u: 0, v: 3 },
    });
    expect(touchPlay(tried, sprout(1)).refusal).toBeNull();
  });

  it('undoes the last move, and starts again from the beginning', () => {
    const two = touchAll(startPlay(garden, moves), [0, 1, 2, 3]);
    expect(lanternCount(undoPlay(two))).toBe(1);
    expect(lanternCount(undoPlay(undoPlay(undoPlay(two))))).toBe(0);
    const again = resetPlay(touchPlay(two, sprout(0)));
    expect(again.history).toHaveLength(1);
    expect(again.touched).toEqual([]);
    expect(lanternCount(again)).toBe(0);
  });
});

describe('a garden to play in the Codex: a chain on the brigade of 1.3', () => {
  const moves: readonly DiagramMove[] = ['chain'];
  const garden = gardenOf('1.3');

  it('passes the chain touched from S to T, one lantern more', () => {
    const drawn = touchAll(startPlay(garden, moves), [0, 1, 2, 3, 4, 5]);
    expect(drawn.touched).toEqual([0, 1, 2, 3, 4, 5]);
    const passed = passChain(drawn);
    expect(lanternCount(passed)).toBe(4);
    expect(passed.touched).toEqual([]);
  });

  it('keeps a refused chain drawn, so it can be mended', () => {
    const drawn = touchAll(startPlay(garden, moves), [0, 1, 2, 6]);
    const refused = passChain(drawn);
    expect(refused.history).toHaveLength(1);
    expect(refused.touched).toEqual([0, 1, 2, 6]);
    expect(refused.refusal?.reason.code).toBe('invalidPath');
  });

  it('passes nothing with fewer than two sprouts touched', () => {
    const one = touchAll(startPlay(garden, moves), [0]);
    expect(passChain(one)).toBe(one);
  });
});
