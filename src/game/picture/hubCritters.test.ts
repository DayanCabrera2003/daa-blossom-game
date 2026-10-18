import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assetEntry } from '../assets/keys';
import type { Rect } from './boxDistance';
import { CRITTER_HOME, CRITTER_SIZE, CRITTERS, critterPose, FLIGHT_MS } from './hubCritters';

/** A home of the size `id` asks for, somewhere on the canvas. */
const homeOf = (id: (typeof CRITTERS)[number], x = 40, y = 220): Rect => ({
  x,
  y,
  ...CRITTER_HOME[id],
});

/** How many frames a sheet holds. */
const framesOf = (sheet: Parameters<typeof assetEntry>[0]): number => {
  const { image, frame } = assetEntry(sheet);
  return image === undefined || frame === undefined
    ? 0
    : (image.width / frame.width) * (image.height / frame.height);
};

describe('the critters of the hub', () => {
  it('has a home for the frog, the cat, the two hens and the two butterflies', () => {
    expect([...CRITTERS].sort()).toEqual(
      ['butterfly', 'butterflyBlue', 'cat', 'chickenBrown', 'chickenWhite', 'frog'].sort(),
    );
    for (const id of CRITTERS) {
      expect(CRITTER_HOME[id].width).toBeGreaterThanOrEqual(CRITTER_SIZE);
      expect(CRITTER_HOME[id].height).toBeGreaterThanOrEqual(CRITTER_SIZE);
    }
  });

  it('gives the same pose at the same instant, inside its home, on a frame of its sheet', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CRITTERS),
        fc.integer({ min: 0, max: 400 }),
        fc.integer({ min: 0, max: 250 }),
        fc.integer({ min: -100_000, max: 10_000_000 }),
        (id, x, y, now) => {
          const home = homeOf(id, x, y);
          const pose = critterPose(id, home, now);
          expect(critterPose(id, home, now)).toEqual(pose);
          expect(Number.isInteger(pose.x) && Number.isInteger(pose.y)).toBe(true);
          expect(pose.x).toBeGreaterThanOrEqual(home.x);
          expect(pose.y).toBeGreaterThanOrEqual(home.y);
          expect(pose.x + CRITTER_SIZE).toBeLessThanOrEqual(home.x + home.width);
          expect(pose.y + CRITTER_SIZE).toBeLessThanOrEqual(home.y + home.height);
          expect(pose.frame).toBeGreaterThanOrEqual(0);
          expect(pose.frame).toBeLessThan(framesOf(pose.sheet));
        },
      ),
    );
  });

  it('flies each butterfly round a closed loop, back where it was after a lap', () => {
    for (const id of ['butterfly', 'butterflyBlue'] as const) {
      const home = homeOf(id);
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1_000_000 }), (now) => {
          const lap = critterPose(id, home, now + FLIGHT_MS[id]);
          const here = critterPose(id, home, now);
          expect({ x: lap.x, y: lap.y, flipX: lap.flipX }).toEqual({
            x: here.x,
            y: here.y,
            flipX: here.flipX,
          });
        }),
      );
      // Over a lap it crosses its whole home.
      const xs = Array.from(
        { length: 100 },
        (_, k) => critterPose(id, home, (k * FLIGHT_MS[id]) / 100).x,
      );
      expect(Math.min(...xs)).toBe(home.x);
      expect(Math.max(...xs)).toBe(home.x + home.width - CRITTER_SIZE);
    }
  });

  it('turns a butterfly to the side it flies to', () => {
    const home = homeOf('butterfly');
    const a = critterPose('butterfly', home, 0);
    const b = critterPose('butterfly', home, FLIGHT_MS.butterfly / 8);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.sheet).toBe('critter.butterfly');
    // Right-facing frames are in the fourth column of its sheet.
    expect(b.frame % 4).toBe(3);
    const back = critterPose('butterfly', home, (FLIGHT_MS.butterfly * 5) / 8);
    expect(back.frame % 4).toBe(2);
  });

  it('lets the cat doze most of the time and walk now and then, facing its way', () => {
    const home = homeOf('cat');
    const poses = Array.from({ length: 400 }, (_, k) => critterPose('cat', home, k * 100));
    const resting = poses.filter((pose, k) => pose.x === poses[k + 1]?.x);
    expect(resting.length).toBeGreaterThan(poses.length / 2);
    // Both ends of its home are reached, and it faces left only after walking back.
    expect(new Set(poses.map((pose) => pose.x))).toContain(home.x);
    expect(new Set(poses.map((pose) => pose.x))).toContain(home.x + home.width - CRITTER_SIZE);
    poses.forEach((pose, k) => {
      const next = poses[k + 1];
      if (next === undefined || next.x === pose.x) return;
      expect(next.flipX).toBe(next.x < pose.x);
    });
  });

  it('lets the hens peck and the frog hop in place now and then', () => {
    for (const id of ['chickenWhite', 'chickenBrown', 'frog'] as const) {
      const frames = new Set(
        Array.from({ length: 200 }, (_, k) => critterPose(id, homeOf(id), k * 97).frame),
      );
      expect(frames.size, id).toBe(2);
    }
    const frog = homeOf('frog');
    expect(critterPose('frog', frog, 1234)).toMatchObject({ x: frog.x, y: frog.y });
  });
});
