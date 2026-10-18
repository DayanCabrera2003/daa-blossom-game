import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Rect } from '../picture/boxDistance';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { TOUCH_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { HIT_PADDING, hitZone, touchRoom, type TouchRoom } from './hitPadding';

const CANVAS: Rect = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
const room = (over: Partial<TouchRoom> = {}): TouchRoom => ({
  neighbours: [],
  bounds: CANVAS,
  keepClear: [],
  ...over,
});
const { max } = HIT_PADDING;

/** Whether two boxes share some area (touching edges do not). */
const overlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Whether `inner` lies inside `outer`. */
const within = (inner: Rect, outer: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

describe('the touch zone of a button (plan 09, phase 7)', () => {
  const button: Rect = { x: 100, y: 100, width: 30, height: 14 };

  it('alone in the middle of the canvas, grows by the most on every side', () => {
    expect(hitZone(button, room())).toEqual({
      x: 100 - max,
      y: 100 - max,
      width: 30 + 2 * max,
      height: 14 + 2 * max,
    });
  });

  it('takes half the gap to a neighbour beside it, and its neighbour the other half', () => {
    const right: Rect = { x: 133, y: 100, width: 20, height: 14 };
    const zone = hitZone(button, room({ neighbours: [right] }));
    const other = hitZone(right, room({ neighbours: [button] }));
    expect(zone.x + zone.width).toBe(131.5);
    expect(other.x).toBe(131.5);
    // The other sides are free.
    expect(zone.x).toBe(100 - max);
    expect(zone.height).toBe(14 + 2 * max);
  });

  it('does not grow towards a neighbour it touches', () => {
    const below: Rect = { x: 90, y: 114, width: 50, height: 14 };
    const zone = hitZone(button, room({ neighbours: [below] }));
    expect(zone.y + zone.height).toBe(114);
    expect(zone.y).toBe(100 - max);
  });

  it('does not grow at all over a neighbour it overlaps', () => {
    const over: Rect = { x: 120, y: 105, width: 50, height: 14 };
    expect(hitZone(button, room({ neighbours: [over] }))).toEqual(button);
  });

  it('keeps out of the room given to something else (the garden) entirely, not just half', () => {
    const garden: Rect = { x: 0, y: 24, width: CANVAS_WIDTH, height: 74 };
    const zone = hitZone(button, room({ keepClear: [garden] }));
    expect(zone.y).toBe(98);
  });

  it('stays on the canvas, or inside the panel that holds it', () => {
    const corner: Rect = { x: 1, y: 0, width: 13, height: 13 };
    expect(hitZone(corner, room())).toEqual({ x: 0, y: 0, width: 14 + max, height: 13 + max });
    const panel: Rect = { x: 98, y: 97, width: 40, height: 30 };
    expect(hitZone(button, room({ bounds: panel }))).toEqual({
      x: 98,
      y: 97,
      width: 30 + 2 + max,
      height: 14 + 3 + max,
    });
  });

  it('a neighbour far beyond its corner does not hold it back', () => {
    const far: Rect = { x: 200, y: 200, width: 10, height: 10 };
    expect(hitZone(button, room({ neighbours: [far] }))).toEqual(hitZone(button, room()));
  });

  it('a neighbour just past the corner holds back the side it is beyond', () => {
    // 3 px right of the button and 3 px under it: their grown corners would meet.
    const diagonal: Rect = { x: 133, y: 117, width: 10, height: 10 };
    const zone = hitZone(button, room({ neighbours: [diagonal] }));
    const other = hitZone(diagonal, room({ neighbours: [button] }));
    expect(overlap(zone, other)).toBe(false);
  });

  /** Boxes that do not overlap, on the canvas, from random ones (the overlapping ones dropped). */
  const boxes = fc
    .array(
      fc.record({
        x: fc.integer({ min: 0, max: CANVAS_WIDTH - 10 }),
        y: fc.integer({ min: 0, max: CANVAS_HEIGHT - 10 }),
        width: fc.integer({ min: 4, max: 60 }),
        height: fc.integer({ min: 4, max: 20 }),
      }),
      { maxLength: 30 },
    )
    .map((all) =>
      all
        .map((box) => ({
          ...box,
          width: Math.min(box.width, CANVAS_WIDTH - box.x),
          height: Math.min(box.height, CANVAS_HEIGHT - box.y),
        }))
        .reduce<Rect[]>(
          (kept, box) => (kept.some((k) => overlap(k, box)) ? kept : [...kept, box]),
          [],
        ),
    );

  it(
    'property: every zone holds its box, stays on the canvas, and no two zones overlap',
    () => {
      fc.assert(
        fc.property(boxes, (all) => {
          const zones = all.map((box, i) =>
            hitZone(box, room({ neighbours: all.filter((_, j) => j !== i) })),
          );
          zones.forEach((zone, i) => {
            const box = all[i] as Rect;
            expect(within(box, zone)).toBe(true);
            expect(within(zone, CANVAS)).toBe(true);
            expect(zone.x).toBeGreaterThanOrEqual(box.x - max);
            expect(zone.width).toBeLessThanOrEqual(box.width + 2 * max);
            expect(zone.height).toBeLessThanOrEqual(box.height + 2 * max);
            zones.forEach((other, j) => {
              if (j !== i) expect(overlap(zone, other), `${i} and ${j}`).toBe(false);
            });
          });
        }),
      );
    },
    TOUCH_PROPERTY_TIMEOUT,
  );

  it(
    'property: no zone reaches into a room kept clear',
    () => {
      fc.assert(
        fc.property(boxes, (all) => {
          const [keep, ...buttons] = all;
          if (keep === undefined) return;
          buttons.forEach((box, i) => {
            const zone = hitZone(
              box,
              room({ neighbours: buttons.filter((_, j) => j !== i), keepClear: [keep] }),
            );
            expect(overlap(zone, keep)).toBe(false);
          });
        }),
      );
    },
    TOUCH_PROPERTY_TIMEOUT,
  );
});

describe('the room round a button on a screen', () => {
  const button = { box: { x: 100, y: 100, width: 30, height: 14 }, depth: 201 };
  const garden: Rect = { x: 0, y: 24, width: CANVAS_WIDTH, height: 217 };

  it('on the HUD: the canvas holds it, the others are its neighbours, the garden is kept clear', () => {
    const other = { box: { x: 140, y: 100, width: 20, height: 14 }, depth: 100 };
    expect(touchRoom({ ...button, depth: 100 }, [other], [], [garden])).toEqual({
      neighbours: [other.box],
      bounds: CANVAS,
      keepClear: [garden],
    });
  });

  it('in a panel: the smallest cover under it holds it, and nothing else is kept clear', () => {
    const dim = { box: CANVAS, depth: 199 };
    const panel = { box: { x: 90, y: 90, width: 100, height: 40 }, depth: 200 };
    const above = { box: { x: 95, y: 95, width: 60, height: 30 }, depth: 300 };
    expect(touchRoom(button, [], [dim, panel, above], [garden])).toEqual({
      neighbours: [],
      bounds: panel.box,
      keepClear: [],
    });
  });

  it('a cover that does not hold the whole button is not its panel', () => {
    const half = { box: { x: 110, y: 90, width: 100, height: 40 }, depth: 200 };
    expect(touchRoom(button, [], [half], []).bounds).toEqual(CANVAS);
  });
});
