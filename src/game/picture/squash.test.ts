import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Point } from '../input/target';
import { HOP_HEIGHT, hopPose } from './squash';

const from: Point = { x: 100, y: 80 };
const to: Point = { x: 160, y: 110 };

describe('the lantern hopping from sprout to sprout (GDD §4.1, key animation 1)', () => {
  it('starts and ends at its own size, on the sprouts it leaves and reaches', () => {
    expect(hopPose(from, to, 0)).toEqual({ ...from, height: 0, scaleX: 1, scaleY: 1, alpha: 1 });
    const landed = hopPose(from, to, 1);
    expect(landed.x).toBe(to.x);
    expect(landed.y).toBe(to.y);
    expect(landed.height).toBe(0);
    expect(landed.scaleX).toBeCloseTo(1);
    expect(landed.scaleY).toBeCloseTo(1);
  });

  it('crouches before leaving, stretches in the air and squashes as it lands', () => {
    // Squashed: lower and wider than itself, still on the sprout it leaves.
    const crouch = hopPose(from, to, 0.12);
    expect(crouch.scaleY).toBeLessThan(1);
    expect(crouch.scaleX).toBeGreaterThan(1);
    expect({ x: crouch.x, y: crouch.y }).toEqual(from);
    // Stretched at the top of the jump, which is its highest point.
    const top = hopPose(from, to, 0.475);
    expect(top.scaleY).toBeGreaterThan(1);
    expect(top.height).toBeCloseTo(HOP_HEIGHT);
    // Squashed again on the sprout it reaches.
    const touch = hopPose(from, to, 0.85);
    expect(touch.scaleY).toBeLessThan(1);
    expect({ x: touch.x, y: touch.y }).toEqual(to);
  });

  it('keeps its area as it squashes and stretches, and never leaves the way between', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (progress) => {
        const pose = hopPose(from, to, progress);
        expect(pose.scaleX * pose.scaleY).toBeCloseTo(1);
        expect(pose.height).toBeGreaterThanOrEqual(0);
        expect(pose.height).toBeLessThanOrEqual(HOP_HEIGHT + 1e-9);
        expect(pose.x).toBeGreaterThanOrEqual(from.x);
        expect(pose.x).toBeLessThanOrEqual(to.x);
      }),
    );
  });

  it('moves smoothly: a little later, it is only a little further and a little changed', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.999, noNaN: true }), (progress) => {
        const now = hopPose(from, to, progress);
        const next = hopPose(from, to, progress + 0.001);
        expect(Math.abs(next.scaleY - now.scaleY)).toBeLessThan(0.02);
        expect(Math.abs(next.height - now.height)).toBeLessThan(0.1);
        expect(Math.hypot(next.x - now.x, next.y - now.y)).toBeLessThan(0.2);
      }),
    );
  });

  it('keeps out-of-range times at the ends of the hop', () => {
    expect(hopPose(from, to, -0.5)).toEqual(hopPose(from, to, 0));
    expect(hopPose(from, to, 1.5)).toEqual(hopPose(from, to, 1));
  });
});

describe('the hop with less motion (plan 09, phase 6)', () => {
  it('never squashes, stretches nor leaves the ground', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (progress) => {
        const pose = hopPose(from, to, progress, true);
        expect(pose.scaleX).toBe(1);
        expect(pose.scaleY).toBe(1);
        expect(pose.height).toBe(0);
      }),
    );
  });

  it('fades out on the sprout it leaves and in on the one it reaches, never in between', () => {
    expect(hopPose(from, to, 0, true)).toMatchObject({ ...from, alpha: 1 });
    expect(hopPose(from, to, 0.25, true)).toMatchObject({ ...from, alpha: 0.5 });
    expect(hopPose(from, to, 0.75, true)).toMatchObject({ ...to, alpha: 0.5 });
    expect(hopPose(from, to, 1, true)).toMatchObject({ ...to, alpha: 1 });
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (progress) => {
        const pose = hopPose(from, to, progress, true);
        const onOne =
          (pose.x === from.x && pose.y === from.y) || (pose.x === to.x && pose.y === to.y);
        expect(onOne).toBe(true);
        expect(pose.alpha).toBeGreaterThanOrEqual(0);
        expect(pose.alpha).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('is always fully seen with all its motion', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (progress) => {
        expect(hopPose(from, to, progress).alpha).toBe(1);
      }),
    );
  });
});
