import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { foundChain } from '../systems/liftGaps';
import { foundTrailPicture } from './foundTrail';
import type { Point } from '../input/target';

const level = catalog().find((candidate) => candidate.data.id === '4.5') as Level;
const positions: Point[] = level.data.sprouts.map(({ x, y }) => ({ x, y }));
const at = (name: string): Point =>
  positions[level.data.sprouts.findIndex((sprout) => sprout.label === name)] as Point;

/** The day of 4.5's reference solution: its first state, then one after each move. */
const day: GardenState[] = [level.start];
for (const action of level.solution) {
  const outcome = applyAction(day[day.length - 1] as GardenState, action);
  if (!outcome.ok) throw new Error(`${action.type} refused`);
  day.push(outcome.state);
}

/** The trail drawn at step `cursor` of the day, each segment as a set of its two ends. */
function trail(cursor: number, insideLayer = false) {
  const picture = foundTrailPicture(
    foundChain(day, cursor),
    day[cursor] as GardenState,
    positions,
    insideLayer,
  );
  return picture.map(([a, b]) => [a, b].sort((p, q) => p.x - q.x || p.y - q.y));
}

/** A segment between two points, ends sorted as `trail` sorts them. */
const segment = (a: Point, b: Point) => [a, b].sort((p, q) => p.x - q.x || p.y - q.y);

describe('the found trail of 4.5 (plan 10, phase 2)', () => {
  // Moves: three looks of the light, fold, the look that finds the chain, unfold, the chain.
  const found = 5;
  const unfolded = 6;
  const middle: Point = {
    x: (at('b').x + at('c').x + at('d').x) / 3,
    y: (at('b').y + at('c').y + at('d').y) / 3,
  };

  it('is not drawn before the light finds the chain', () => {
    expect(trail(found - 1)).toEqual([]);
  });

  it('passes through the closed flower once the chain is found', () => {
    expect(trail(found)).toEqual([
      segment(at('R'), at('a')),
      segment(at('a'), middle),
      segment(middle, at('e')),
    ]);
  });

  it('with the flower open, draws R–a=b and c–e and leaves the gap b…c undrawn', () => {
    expect(trail(unfolded)).toEqual(
      expect.arrayContaining([
        segment(at('R'), at('a')),
        segment(at('a'), at('b')),
        segment(at('c'), at('e')),
      ]),
    );
    expect(trail(unfolded)).toHaveLength(3);
  });

  it('is gone once the chain is lit, and inside a flower entered with the layers', () => {
    expect(trail(unfolded + 1)).toEqual([]);
    expect(trail(found, true)).toEqual([]);
  });
});
