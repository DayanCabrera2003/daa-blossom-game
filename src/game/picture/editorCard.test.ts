import { itemAt } from '@core/shared/itemAt';
import { DEMO_AREA } from '@levels/cards/schema';
import { CARD_IDS } from '@levels/cards/schema';
import { describe, expect, it } from 'vitest';
import { EDITOR_CARD, editorCardLoop } from './editorCard';

describe("the free mode editor's mechanic card", () => {
  const loop = editorCardLoop();
  const frames = Array.from({ length: loop.frames }, (_, frame) => loop.pictureAt(frame));

  it('is seen once like the cards of the levels, under an id none of them uses', () => {
    expect((CARD_IDS as readonly string[]).includes(EDITOR_CARD)).toBe(false);
  });

  it('plants sprouts one touch at a time, each where the finger lands', () => {
    const counts = frames.map((frame) => frame.garden.sprouts.length);
    expect(counts[0]).toBe(1);
    expect(Math.max(...counts)).toBe(3);
    const planted = frames.findIndex((frame) => frame.garden.sprouts.length === 2);
    const sprout = itemAt(itemAt(frames, planted).garden.sprouts, 1);
    expect(itemAt(frames, planted).touches).toEqual([{ x: sprout.x, y: sprout.y }]);
  });

  it('then joins two sprouts with a vine and hangs a lantern on it, touched at its middle', () => {
    const last = itemAt(frames, frames.length - 1);
    expect(last.garden.vines.length).toBeGreaterThanOrEqual(1);
    expect(last.garden.vines.some((vine) => vine.lit)).toBe(true);
    const lighting = frames.find(
      (frame) => frame.garden.vines.some((vine) => vine.lit) && frame.touches.length > 0,
    );
    const vine = lighting?.garden.vines.find((candidate) => candidate.lit);
    expect(lighting?.touches).toEqual([
      {
        x: ((vine?.a.x ?? 0) + (vine?.b.x ?? 0)) / 2,
        y: ((vine?.a.y ?? 0) + (vine?.b.y ?? 0)) / 2,
      },
    ]);
  });

  it('draws the gesture, not the names: no sprout is named, and nothing but the garden shows', () => {
    for (const frame of frames) {
      expect(frame.garden.sprouts.every((sprout) => sprout.label === '')).toBe(true);
      expect([frame.sun, frame.choices, frame.press]).toEqual([null, null, null]);
    }
  });

  it("keeps every sprout inside the demo's box, and loops the last frame past the end", () => {
    for (const frame of frames) {
      for (const { x, y } of frame.garden.sprouts) {
        expect(
          x >= DEMO_AREA.x0 && x <= DEMO_AREA.x1 && y >= DEMO_AREA.y0 && y <= DEMO_AREA.y1,
        ).toBe(true);
      }
    }
    expect(loop.pictureAt(loop.frames + 5)).toEqual(itemAt(frames, frames.length - 1));
  });
});
