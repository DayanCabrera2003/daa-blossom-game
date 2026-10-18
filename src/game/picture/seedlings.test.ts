import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import {
  MAX_SEEDLINGS,
  SEEDLING_BAND,
  SEEDLING_SIZE,
  seedlingFrame,
  seedlingSpots,
} from './seedlings';

describe('the plants of the seeds in the hub', () => {
  it('sprout side by side along the front of the bed, from the left', () => {
    const spots = seedlingSpots(3, []);
    expect(spots).toHaveLength(3);
    spots.forEach((spot, k) => {
      expect(spot.y + spot.height).toBe(CANVAS_HEIGHT);
      expect(spot.width).toBe(SEEDLING_SIZE);
      expect(spot.x).toBe(SEEDLING_BAND.x + k * (SEEDLING_SIZE + 1));
    });
  });

  it('never cover what is taken, the sign of the epilogue among it, nor one another', () => {
    const sign: Rect = { x: 20, y: CANVAS_HEIGHT - 22, width: 60, height: 15 };
    const spots = seedlingSpots(MAX_SEEDLINGS + 3, [sign]);
    // No more than the plants there can be.
    expect(spots).toHaveLength(MAX_SEEDLINGS);
    spots.forEach((spot, k) => {
      expect(boxesOverlap(spot, sign, 0)).toBe(false);
      for (const other of spots.slice(k + 1)) expect(boxesOverlap(spot, other, 0)).toBe(false);
    });
  });

  it('leaves out a plant with no room', () => {
    expect(seedlingSpots(2, [SEEDLING_BAND])).toEqual([]);
    expect(seedlingSpots(0, [])).toEqual([]);
  });

  it('sways each plant through the four frames of its sheet, out of step', () => {
    const frames = new Set(Array.from({ length: 40 }, (_, k) => seedlingFrame(0, k * 100)));
    expect(frames).toEqual(new Set([0, 1, 2, 3]));
    expect(seedlingFrame(1, 0)).not.toBe(seedlingFrame(0, 0));
    expect(seedlingFrame(2, -1)).toBeGreaterThanOrEqual(0);
  });
});
