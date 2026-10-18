import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/game/picture/boxDistance';
import { focusRing } from '../src/game/picture/focusRing';
import { firstSpot, moveFocus, reachable, readingOrder } from '../src/game/input/focusOrder';
import { hubSpots, playable, STATES, wonUpTo } from './support/hubSpots';
// The keyboard on the hub (plan 09, phase 4), with the real catalog and the real words, as
// `HubScene` lays it out: on a fresh hub, halfway and with everything won, and in teacher mode, Tab
// visits every pressable thing (the signs, the gear, the flowers, the open levels, the epilogue's
// sign) once and comes back to where it started, chapter after chapter, and the focus ring of each
// stays on the canvas without covering another thing's label.

/**
 * Whether a side of a ring (a one-pixel rectangle) touches `box` deeper than its outermost pixels,
 * where a label is.
 */
const ringCovers = (line: Rect, box: Rect): boolean =>
  line.x + line.width - 1 > box.x &&
  line.x < box.x + box.width - 1 &&
  line.y + line.height - 1 > box.y &&
  line.y < box.y + box.height - 1;

describe.each(STATES)('the keyboard on the hub: $name', ({ save, teacher }) => {
  const spots = hubSpots(save, teacher);

  it('has something to press, every level open among it, all of it within reach', () => {
    expect(spots.length).toBeGreaterThan(1);
    expect(spots.map((spot) => spot.id)).toContain('gear');
    expect(reachable(spots, [])).toEqual(spots);
  });

  it('Tab visits every pressable thing once and comes back to the first', () => {
    const first = firstSpot(spots);
    expect(first).not.toBeNull();
    const seen: string[] = [];
    let at = first;
    for (let i = 0; i < spots.length; i += 1) {
      at = moveFocus(spots, at, 'next');
      seen.push(at ?? '');
    }
    expect(at).toBe(first);
    expect([...seen].sort()).toEqual(spots.map((spot) => spot.id).sort());
  });

  it('reads the top line first, then each chapter in order, its flower before its levels', () => {
    const order = readingOrder(spots.map((spot) => spot.box)).map((i) => spots[i]?.id ?? '');
    const levelsRead = order.filter((id) => /^\d+\.\d+$/.test(id));
    const chapterOf = (id: string): number => Number(id.split('.')[0]);
    for (let i = 1; i < levelsRead.length; i += 1) {
      expect(chapterOf(levelsRead[i] ?? '')).toBeGreaterThanOrEqual(
        chapterOf(levelsRead[i - 1] ?? ''),
      );
    }
    const firstLevel = order.findIndex((id) => /^\d+\.\d+$/.test(id));
    expect(order.indexOf('gear')).toBeLessThan(firstLevel);
    for (const id of order.filter((one) => one.startsWith('flower '))) {
      const chapter = id.slice('flower '.length).split('.')[0];
      const own = order.findIndex((one) => one.startsWith(`${chapter}.`));
      if (own >= 0) expect(order.indexOf(id)).toBeLessThan(own);
    }
  });

  it("the ring of each thing in focus covers no other thing's label", () => {
    const covered: string[] = [];
    for (const spot of spots) {
      const ring = focusRing(spot.box);
      for (const line of [...ring.light, ...ring.dark]) {
        for (const other of spots) {
          if (other !== spot && ringCovers(line, other.box))
            covered.push(`${spot.id} over ${other.id}`);
        }
      }
    }
    expect(covered).toEqual([]);
  });
});

describe('the hub with everything won', () => {
  it('has the flowers, every sign and the way to the epilogue to walk', () => {
    const ids = hubSpots(wonUpTo(playable.length), false).map((spot) => spot.id);
    for (const id of ['codex', 'notebook', 'sandbox', 'epilogue']) expect(ids).toContain(id);
    expect(ids.some((id) => id.startsWith('flower '))).toBe(true);
    expect(ids.filter((id) => /^\d+\.\d+$/.test(id)).length).toBe(
      playable.filter((level) => level.secret === undefined).length,
    );
  });
});
