import type { Blossom, GardenNode } from '@core/blossom/types';
import { itemAt } from '@core/shared/itemAt';
import { describe, expect, it } from 'vitest';
import type { Point } from '../input/target';
import { foldShapes } from './foldShape';

const sprout = (vertex: number): GardenNode => ({ kind: 'sprout', vertex });
const flower = (id: number, cycle: GardenNode[]): Blossom => ({
  kind: 'blossom',
  id,
  cycle,
  edges: [],
});

/** Five sprouts: a triangle 0–1–2, and 3 and 4 off to the right. */
const positions: Point[] = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 0, y: 30 },
  { x: 90, y: 0 },
  { x: 90, y: 30 },
];
const at = (v: number): Point => itemAt(positions, v);

describe('the shape each flower folds into', () => {
  it('brings each sprout of the cycle to the middle of the flower, one petal each', () => {
    const shapes = foldShapes([[flower(0, [sprout(0), sprout(1), sprout(2)]), sprout(3)]], at);
    expect([...shapes.keys()]).toEqual([0]);
    expect(shapes.get(0)).toEqual({
      open: [positions[0], positions[1], positions[2]],
      centre: { x: 10, y: 10 },
      petals: 3,
    });
  });

  it('moves a flower nested in the cycle as one, from the middle of its own sprouts', () => {
    const inner = flower(0, [sprout(0), sprout(1), sprout(2)]);
    const outer = flower(1, [inner, sprout(3), sprout(4)]);
    const shapes = foldShapes([[outer]], at);
    expect(shapes.get(1)?.open).toEqual([{ x: 10, y: 10 }, positions[3], positions[4]]);
    expect(shapes.get(1)?.centre).toEqual({ x: 42, y: 12 });
    expect(shapes.get(1)?.petals).toBe(3);
    // The nested flower keeps its own shape, for when it is opened in turn.
    expect(shapes.get(0)?.centre).toEqual({ x: 10, y: 10 });
  });

  it('knows the flowers of every garden it is given, the first one naming each', () => {
    const before = [flower(0, [sprout(0), sprout(1), sprout(2)])];
    const after = [flower(2, [sprout(1), sprout(3), sprout(4)])];
    const shapes = foldShapes([before, after, [flower(2, [sprout(0), sprout(3), sprout(4)])]], at);
    expect([...shapes.keys()].sort()).toEqual([0, 2]);
    expect(shapes.get(2)?.open[0]).toEqual(positions[1]);
    expect(foldShapes([[sprout(0)]], at).size).toBe(0);
  });
});
