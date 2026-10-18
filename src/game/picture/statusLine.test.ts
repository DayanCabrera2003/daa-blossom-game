import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { STATUS_LINE, statusLine, type StatusParts } from './statusLine';

const parts = (over: Partial<StatusParts> = {}): StatusParts => ({
  start: 4,
  lanterns: 60,
  drop: 14,
  water: { full: 48, short: 12 },
  layer: 36,
  ...over,
});

/** Where the left part of the status line ends, as laid out. */
const endOf = (p: StatusParts, at: ReturnType<typeof statusLine>): number =>
  at.layer !== null && p.layer !== null
    ? at.layer + p.layer
    : at.water !== null && p.water !== null
      ? at.water + (at.short ? p.water.short : p.water.full)
      : p.start + p.lanterns;

describe("the status line's left part", () => {
  it('with room, the water after its drop and the layers, three letters of air before each', () => {
    const at = statusLine(parts(), 476);
    const gap = STATUS_LINE.gap;
    expect(at).toEqual({
      drop: 64 + gap,
      water: 64 + gap + 14 + STATUS_LINE.iconGap,
      short: false,
      layer: 64 + gap + 14 + STATUS_LINE.iconGap + 48 + gap,
    });
  });

  it('without water or layers, only the lanterns, and nothing else placed', () => {
    expect(statusLine(parts({ water: null, layer: null }), 476)).toEqual({
      drop: null,
      water: null,
      short: false,
      layer: null,
    });
  });

  it('without water, the layers right after the lanterns', () => {
    const at = statusLine(parts({ water: null }), 476);
    expect(at.layer).toBe(64 + STATUS_LINE.gap);
  });

  it('squeezes its air, never under a letter, before it reaches what is on its right', () => {
    const p = parts();
    const full = endOf(p, statusLine(p, 476));
    const at = statusLine(p, full - 10);
    expect(at.short).toBe(false);
    expect(endOf(p, at)).toBeLessThanOrEqual(full - 10);
    expect((at.water ?? 0) - 14 - STATUS_LINE.iconGap - 64).toBeGreaterThanOrEqual(
      STATUS_LINE.minGap,
    );
  });

  it('where even squeezed it would not fit, the water keeps its drop and loses its word', () => {
    const p = parts();
    const at = statusLine(p, 4 + 60 + 14 + 2 + 12 + 36 + 2 * STATUS_LINE.minGap + 4);
    expect(at.short).toBe(true);
    expect(endOf(p, at)).toBeLessThanOrEqual(
      4 + 60 + 14 + 2 + 12 + 36 + 2 * STATUS_LINE.minGap + 4,
    );
  });

  it('whatever the room, its parts keep their order and at least a letter of air', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 80 }),
        fc.option(fc.integer({ min: 18, max: 80 }), { nil: null }),
        fc.option(fc.integer({ min: 18, max: 60 }), { nil: null }),
        fc.integer({ min: 0, max: 476 }),
        (lanterns, water, layer, end) => {
          const p = parts({
            lanterns,
            water: water === null ? null : { full: water, short: water - 12 },
            layer,
          });
          const at = statusLine(p, end);
          const afterLanterns = p.start + lanterns;
          if (at.drop !== null) expect(at.drop - afterLanterns).toBeGreaterThanOrEqual(6);
          if (at.drop !== null && at.water !== null)
            expect(at.water).toBe(at.drop + 14 + STATUS_LINE.iconGap);
          if (at.layer !== null) {
            const before =
              at.water !== null && p.water !== null
                ? at.water + (at.short ? p.water.short : p.water.full)
                : afterLanterns;
            expect(at.layer - before).toBeGreaterThanOrEqual(STATUS_LINE.minGap);
          }
          // With the full room it would take, it never squeezes or shortens anything.
          if (end >= endOf(p, statusLine(p, 10_000))) {
            expect(at).toEqual(statusLine(p, 10_000));
          }
        },
      ),
    );
  });
});
